"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  Package,
  Phone,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import Pagination, { usePagination } from "@/components/Pagination";

type SupplierOption = {
  id: number;
  code: string;
  name: string;
  phone: string | null;
};

type GroupedProductItem = {
  productId: number;
  productCode: string;
  productName: string;
  categoryName: string;
  unitName: string;
  totalQuantity: number;
  minUnitPrice: number;
  maxUnitPrice: number;
  totalDiscount: number;
  totalValue: number;
};

type PurchaseLineDetail = {
  purchaseId: number;
  purchaseNo: string;
  purchaseDate: string;
  status: string;
  productId: number;
  productCode: string;
  productName: string;
  categoryName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
};

type SupplierReportRow = {
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  supplierPhone: string | null;
  purchaseCount: number;
  totalQuantity: number;
  subtotal: number;
  discount: number;
  tax: number;
  totalValue: number;
  paidAmount: number;
  balanceAmount: number;
  groupedProducts: GroupedProductItem[];
  lines: PurchaseLineDetail[];
};

type PurchaseReportData = {
  from: string;
  to: string;
  allSuppliers: SupplierOption[];
  summary: {
    supplierCount: number;
    purchaseCount: number;
    totalQuantity: number;
    subtotal: number;
    discount: number;
    tax: number;
    totalValue: number;
    paidAmount: number;
    balanceAmount: number;
  };
  suppliers: SupplierReportRow[];
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

export default function PurchaseReportClient() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [supplierId, setSupplierId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [detailMode, setDetailMode] = useState<"GROUPED" | "HISTORY">("GROUPED");
  const [expandedSuppliers, setExpandedSuppliers] = useState<
    Record<number, boolean>
  >({});
  const [data, setData] = useState<PurchaseReportData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadReport() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        from,
        to,
        supplierId,
        status: statusFilter,
      });

      const response = await fetch(
        `/api/reports/purchases?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load supplier & purchase report."
        );
      }

      setData(result.data);

      if (result.data?.suppliers?.length > 0) {
        const nextExpanded: Record<number, boolean> = {};
        if (result.data.suppliers.length <= 3 || supplierId !== "ALL") {
          for (const s of result.data.suppliers) {
            nextExpanded[s.supplierId] = true;
          }
        } else {
          nextExpanded[result.data.suppliers[0].supplierId] = true;
        }
        setExpandedSuppliers(nextExpanded);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load supplier & purchase report."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSuppliers = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.suppliers;

    return data.suppliers.filter((s) => {
      const matchSupplier =
        s.supplierName.toLowerCase().includes(q) ||
        s.supplierCode.toLowerCase().includes(q) ||
        (s.supplierPhone && s.supplierPhone.toLowerCase().includes(q));

      const matchLines = s.lines.some(
        (l) =>
          l.productName.toLowerCase().includes(q) ||
          l.productCode.toLowerCase().includes(q) ||
          l.purchaseNo.toLowerCase().includes(q) ||
          l.categoryName.toLowerCase().includes(q)
      );

      return matchSupplier || matchLines;
    });
  }, [data, search]);

  const filteredSummary = useMemo(() => {
    let purchaseCount = 0;
    let totalQuantity = 0;
    let totalValue = 0;
    let paidAmount = 0;
    let balanceAmount = 0;

    for (const s of filteredSuppliers) {
      purchaseCount += s.purchaseCount;
      totalQuantity += s.totalQuantity;
      totalValue += s.totalValue;
      paidAmount += s.paidAmount;
      balanceAmount += s.balanceAmount;
    }

    return {
      supplierCount: filteredSuppliers.length,
      purchaseCount,
      totalQuantity,
      totalValue,
      paidAmount,
      balanceAmount,
    };
  }, [filteredSuppliers]);

  const pagination = usePagination(filteredSuppliers, 10);

  function toggleSupplier(id: number) {
    setExpandedSuppliers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function expandAll() {
    const next: Record<number, boolean> = {};
    for (const s of filteredSuppliers) {
      next[s.supplierId] = true;
    }
    setExpandedSuppliers(next);
  }

  function collapseAll() {
    setExpandedSuppliers({});
  }

  function exportCsv() {
    if (!filteredSuppliers.length) {
      toast.error("No data to export.");
      return;
    }

    const headers = [
      "Supplier Code",
      "Supplier Name",
      "Phone",
      "Purchase No",
      "Purchase Date",
      "Status",
      "Product Code",
      "Product Name",
      "Category",
      "Quantity",
      "Unit",
      "Unit Cost Price (LKR)",
      "Discount (LKR)",
      "Line Total (LKR)",
    ];

    const rows: string[][] = [];

    for (const sup of filteredSuppliers) {
      for (const l of sup.lines) {
        rows.push([
          sup.supplierCode,
          sup.supplierName,
          sup.supplierPhone || "-",
          l.purchaseNo,
          new Date(l.purchaseDate).toLocaleDateString("en-LK"),
          l.status,
          l.productCode,
          l.productName,
          l.categoryName,
          String(l.quantity),
          l.unitName,
          l.unitPrice.toFixed(2),
          l.discount.toFixed(2),
          l.total.toFixed(2),
        ]);
      }
    }

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
    link.download = `supplier-purchase-report-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Supplier & Purchase CSV downloaded.");
  }

  function handlePrint() {
    expandAll();
    setTimeout(() => {
      window.print();
    }, 150);
  }

  return (
    <div className="min-h-[calc(100dvh_-_4rem)] bg-slate-50 p-3 sm:p-4 lg:min-h-[calc(100dvh_-_5rem)] md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-teal-600">
                Reports · Procurement & Suppliers
              </p>
              <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                Supplier & Purchase Analysis Report
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Track all items purchased from each supplier, unit cost variations, paid amounts, and payables
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                onClick={exportCsv}
                disabled={loading || !filteredSuppliers.length}
                className="flex h-10 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>

              <button
                onClick={handlePrint}
                disabled={loading || !filteredSuppliers.length}
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
              Supplier
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900"
              >
                <option value="ALL">All Suppliers</option>
                {data?.allSuppliers.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Payment Status
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="PENDING">Pending (Unpaid)</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Search Supplier / Product / GRN
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Supplier, product, bill no..."
                  className="block h-10 w-full rounded-lg border pl-9 pr-3 text-sm text-slate-900"
                />
              </div>
            </label>

            <div className="flex items-end">
              <button
                onClick={loadReport}
                disabled={loading}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
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

        {/* Summary KPI Cards */}
        {!data ? (
          <div className="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500">
            {loading ? "Loading supplier & purchase report..." : "No data."}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Suppliers</p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-slate-900">
                  {filteredSummary.supplierCount.toLocaleString()}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Purchase Orders
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-slate-900">
                  {filteredSummary.purchaseCount.toLocaleString()}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Total Qty Purchased
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-teal-600">
                  {qtyFormat(filteredSummary.totalQuantity)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Total Purchase Value
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-slate-900">
                  Rs. {money(filteredSummary.totalValue)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Paid to Suppliers
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-emerald-600">
                  Rs. {money(filteredSummary.paidAmount)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">
                  Payable Balance Due
                </p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-red-600">
                  Rs. {money(filteredSummary.balanceAmount)}
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex flex-col gap-3 min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Item View Mode:
                </span>
                <div className="inline-flex rounded-lg border bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setDetailMode("GROUPED")}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                      detailMode === "GROUPED"
                        ? "bg-white text-teal-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Grouped by Product (Price Range & Total Qty)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailMode("HISTORY")}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                      detailMode === "HISTORY"
                        ? "bg-white text-teal-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Purchase Bill (GRN) Line History
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* Supplier Cards */}
            {filteredSuppliers.length === 0 ? (
              <div className="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500">
                No supplier purchases found for the selected period and filters.
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {pagination.paginatedItems.map((sup) => {
                    const isExpanded = Boolean(expandedSuppliers[sup.supplierId]);

                  return (
                    <div
                      key={sup.supplierId}
                      className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSupplier(sup.supplierId)}
                        className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-slate-50/80 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                            <Truck className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-black text-slate-900">
                                {sup.supplierName}
                              </h3>
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                                {sup.supplierCode}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                              {sup.supplierPhone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5" />
                                  {sup.supplierPhone}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Receipt className="h-3.5 w-3.5" />
                                {sup.purchaseCount} purchase order(s)
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" />
                                {sup.groupedProducts.length} distinct product(s) ·{" "}
                                {qtyFormat(sup.totalQuantity)} total qty
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 border-t pt-3 lg:border-t-0 lg:pt-0">
                          <div>
                            <p className="text-[11px] font-semibold uppercase text-slate-400">
                              Purchase Value
                            </p>
                            <p className="text-base font-black text-slate-900">
                              Rs. {money(sup.totalValue)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold uppercase text-slate-400">
                              Paid
                            </p>
                            <p className="text-sm font-bold text-emerald-600">
                              Rs. {money(sup.paidAmount)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold uppercase text-slate-400">
                              Payable Due
                            </p>
                            <p
                              className={`text-sm font-bold ${
                                sup.balanceAmount > 0
                                  ? "text-red-600"
                                  : "text-slate-500"
                              }`}
                            >
                              Rs. {money(sup.balanceAmount)}
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
                        <div className="border-t bg-slate-50/40 p-4 md:p-5">
                          {detailMode === "GROUPED" ? (
                            <div className="touch-pan-x overscroll-x-contain overflow-x-auto rounded-xl border bg-white">
                              <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                                  <tr>
                                    <th className="px-4 py-3">Product Code</th>
                                    <th className="px-4 py-3">Product Name</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3 text-right">
                                      Total Qty
                                    </th>
                                    <th className="px-4 py-3 text-right">
                                      Unit Cost Price Range
                                    </th>
                                    <th className="px-4 py-3 text-right">
                                      Discount
                                    </th>
                                    <th className="px-4 py-3 text-right">
                                      Total Value
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {sup.groupedProducts.map((item) => (
                                    <tr
                                      key={item.productId}
                                      className="hover:bg-slate-50/80"
                                    >
                                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">
                                        {item.productCode}
                                      </td>
                                      <td className="px-4 py-2.5 font-semibold text-slate-900">
                                        {item.productName}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-600">
                                        {item.categoryName}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                                        {qtyFormat(item.totalQuantity)}{" "}
                                        <span className="text-xs font-normal text-slate-500">
                                          {item.unitName}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">
                                        {item.minUnitPrice === item.maxUnitPrice
                                          ? `Rs. ${money(item.minUnitPrice)}`
                                          : `Rs. ${money(item.minUnitPrice)} – Rs. ${money(item.maxUnitPrice)}`}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-slate-600">
                                        Rs. {money(item.totalDiscount)}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-black text-slate-900">
                                        Rs. {money(item.totalValue)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="touch-pan-x overscroll-x-contain overflow-x-auto rounded-xl border bg-white">
                              <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                                  <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Purchase No</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Product Code</th>
                                    <th className="px-4 py-3">Product Name</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    <th className="px-4 py-3 text-right">
                                      Unit Cost
                                    </th>
                                    <th className="px-4 py-3 text-right">
                                      Discount
                                    </th>
                                    <th className="px-4 py-3 text-right">
                                      Line Total
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {sup.lines.map((l, idx) => (
                                    <tr
                                      key={`${l.purchaseId}-${l.productId}-${idx}`}
                                      className="hover:bg-slate-50/80"
                                    >
                                      <td className="px-4 py-2.5 text-xs text-slate-600">
                                        {new Date(
                                          l.purchaseDate
                                        ).toLocaleDateString("en-LK")}
                                      </td>
                                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-teal-600">
                                        {l.purchaseNo}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            l.status === "PAID"
                                              ? "bg-emerald-50 text-emerald-700"
                                              : l.status === "PARTIAL"
                                                ? "bg-amber-50 text-amber-700"
                                                : "bg-red-50 text-red-700"
                                          }`}
                                        >
                                          {l.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700">
                                        {l.productCode}
                                      </td>
                                      <td className="px-4 py-2.5 font-semibold text-slate-900">
                                        {l.productName}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                                        {qtyFormat(l.quantity)}{" "}
                                        <span className="text-xs font-normal text-slate-500">
                                          {l.unitName}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-slate-700">
                                        Rs. {money(l.unitPrice)}
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-slate-600">
                                        Rs. {money(l.discount)}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-black text-slate-900">
                                        Rs. {money(l.total)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>

                <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm print:hidden">
                  <Pagination pagination={pagination} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

