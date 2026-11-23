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
  Users,
} from "lucide-react";
import { toast } from "sonner";
import Pagination, { usePagination } from "@/components/Pagination";

type CustomerOption = {
  id: number;
  code: string;
  name: string;
  phone: string | null;
};

type GroupedItem = {
  itemKey: string;
  itemCode: string;
  itemName: string;
  itemType: "PRODUCT" | "SERVICE" | "CUSTOM";
  categoryName: string;
  unitName: string;
  totalQuantity: number;
  totalDiscount: number;
  totalTax: number;
  totalValue: number;
};

type PurchaseDetail = {
  saleId: number;
  invoiceNo: string;
  saleDate: string;
  itemKey: string;
  itemCode: string;
  itemName: string;
  itemType: "PRODUCT" | "SERVICE" | "CUSTOM";
  categoryName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
};

type CustomerReportRow = {
  customerKey: string;
  customerId: number | null;
  customerCode: string;
  customerName: string;
  customerPhone: string | null;
  invoiceCount: number;
  totalQuantity: number;
  subtotal: number;
  discount: number;
  tax: number;
  totalValue: number;
  paidAmount: number;
  balanceAmount: number;
  groupedItems: GroupedItem[];
  purchases: PurchaseDetail[];
};

type CustomerReportData = {
  from: string;
  to: string;
  allCustomers: CustomerOption[];
  summary: {
    customerCount: number;
    invoiceCount: number;
    totalQuantity: number;
    subtotal: number;
    discount: number;
    tax: number;
    totalValue: number;
    paidAmount: number;
    balanceAmount: number;
  };
  customers: CustomerReportRow[];
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

export default function CustomerReportClient() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [customerId, setCustomerId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [detailMode, setDetailMode] = useState<"GROUPED" | "HISTORY">("GROUPED");
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<CustomerReportData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadReport() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        from,
        to,
        customerId,
      });

      const response = await fetch(`/api/reports/customers?${params.toString()}`, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load customer report.");
      }

      setData(result.data);

      // Auto-expand first customer if there are results
      if (result.data?.customers?.length > 0) {
        const initialExpanded: Record<string, boolean> = {};
        if (result.data.customers.length <= 3 || customerId !== "ALL") {
          for (const c of result.data.customers) {
            initialExpanded[c.customerKey] = true;
          }
        } else {
          initialExpanded[result.data.customers[0].customerKey] = true;
        }
        setExpandedKeys(initialExpanded);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load customer report."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.customers;

    return data.customers.filter((c) => {
      const matchCustomer =
        c.customerName.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        (c.customerPhone && c.customerPhone.toLowerCase().includes(q));

      const matchItems = c.purchases.some(
        (p) =>
          p.itemName.toLowerCase().includes(q) ||
          p.itemCode.toLowerCase().includes(q) ||
          p.invoiceNo.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q)
      );

      return matchCustomer || matchItems;
    });
  }, [data, search]);

  const filteredSummary = useMemo(() => {
    let invoiceCount = 0;
    let totalQuantity = 0;
    let totalValue = 0;
    let paidAmount = 0;
    let balanceAmount = 0;

    for (const c of filteredCustomers) {
      invoiceCount += c.invoiceCount;
      totalQuantity += c.totalQuantity;
      totalValue += c.totalValue;
      paidAmount += c.paidAmount;
      balanceAmount += c.balanceAmount;
    }

    return {
      customerCount: filteredCustomers.length,
      invoiceCount,
      totalQuantity,
      totalValue,
      paidAmount,
      balanceAmount,
    };
  }, [filteredCustomers]);

  const pagination = usePagination(filteredCustomers, 10);

  function toggleCustomer(key: string) {
    setExpandedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function expandAll() {
    const next: Record<string, boolean> = {};
    for (const c of filteredCustomers) {
      next[c.customerKey] = true;
    }
    setExpandedKeys(next);
  }

  function collapseAll() {
    setExpandedKeys({});
  }

  function exportCsv() {
    if (!filteredCustomers.length) {
      toast.error("No data to export.");
      return;
    }

    const headers = [
      "Customer Code",
      "Customer Name",
      "Phone",
      "Invoice No",
      "Date",
      "Item Code",
      "Item Name",
      "Type",
      "Category",
      "Quantity",
      "Unit",
      "Unit Price (LKR)",
      "Discount (LKR)",
      "Tax (LKR)",
      "Total Value (LKR)",
    ];

    const rows: string[][] = [];

    for (const cust of filteredCustomers) {
      for (const p of cust.purchases) {
        rows.push([
          cust.customerCode,
          cust.customerName,
          cust.customerPhone || "-",
          p.invoiceNo,
          new Date(p.saleDate).toLocaleDateString("en-LK"),
          p.itemCode,
          p.itemName,
          p.itemType,
          p.categoryName,
          String(p.quantity),
          p.unitName,
          p.unitPrice.toFixed(2),
          p.discount.toFixed(2),
          p.tax.toFixed(2),
          p.total.toFixed(2),
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
    link.download = `customer-items-report-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV report downloaded.");
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
        {/* Header & Filter Bar */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                Reports · Customer Analytics
              </p>
              <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                Customer-Wise Items & Value Report
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                View all items purchased by each customer, quantities, invoice history, and total values
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                onClick={exportCsv}
                disabled={loading || !filteredCustomers.length}
                className="flex h-10 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>

              <button
                onClick={handlePrint}
                disabled={loading || !filteredCustomers.length}
                className="flex h-10 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="mt-5 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-5 print:hidden">
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
              Customer
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900"
              >
                <option value="ALL">All Customers</option>
                <option value="WALK_IN">Walk-in Customers Only</option>
                {data?.allCustomers.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-600">
              Search Customer / Item / Invoice
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, phone, item, invoice..."
                  className="block h-10 w-full rounded-lg border pl-9 pr-3 text-sm text-slate-900"
                />
              </div>
            </label>

            <div className="flex items-end">
              <button
                onClick={loadReport}
                disabled={loading}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
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
            {loading ? "Loading customer report..." : "No report data available."}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Customers</p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-slate-900">
                  {filteredSummary.customerCount.toLocaleString()}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Total Invoices</p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-slate-900">
                  {filteredSummary.invoiceCount.toLocaleString()}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Total Items Qty</p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-blue-600">
                  {qtyFormat(filteredSummary.totalQuantity)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Total Value</p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-slate-900">
                  Rs. {money(filteredSummary.totalValue)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Paid Amount</p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-emerald-600">
                  Rs. {money(filteredSummary.paidAmount)}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Balance Due</p>
                <p className="mt-2 break-words text-base font-black sm:text-xl text-amber-600">
                  Rs. {money(filteredSummary.balanceAmount)}
                </p>
              </div>
            </div>

            {/* View Controls Bar */}
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
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Grouped by Item (Total Qty & Value)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailMode("HISTORY")}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                      detailMode === "HISTORY"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Invoice-wise Item History
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

            {/* Customer Cards & Item Tables */}
            {filteredCustomers.length === 0 ? (
              <div className="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500">
                No customer sales found for the selected period and filters.
              </div>
            ) : (
              <div className="space-y-4">
                {pagination.paginatedItems.map((cust) => {
                  const isExpanded = Boolean(expandedKeys[cust.customerKey]);

                  return (
                    <div
                      key={cust.customerKey}
                      className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                    >
                      {/* Customer Summary Row */}
                      <button
                        type="button"
                        onClick={() => toggleCustomer(cust.customerKey)}
                        className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-slate-50/80 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-black text-slate-900">
                                {cust.customerName}
                              </h3>
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                                {cust.customerCode}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                              {cust.customerPhone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5" />
                                  {cust.customerPhone}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Receipt className="h-3.5 w-3.5" />
                                {cust.invoiceCount} invoice(s)
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" />
                                {cust.groupedItems.length} distinct item(s) ·{" "}
                                {qtyFormat(cust.totalQuantity)} total qty
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 border-t pt-3 lg:border-t-0 lg:pt-0">
                          <div>
                            <p className="text-[11px] font-semibold uppercase text-slate-400">
                              Total Value
                            </p>
                            <p className="text-base font-black text-slate-900">
                              Rs. {money(cust.totalValue)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold uppercase text-slate-400">
                              Paid
                            </p>
                            <p className="text-sm font-bold text-emerald-600">
                              Rs. {money(cust.paidAmount)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold uppercase text-slate-400">
                              Balance
                            </p>
                            <p
                              className={`text-sm font-bold ${
                                cust.balanceAmount > 0
                                  ? "text-amber-600"
                                  : "text-slate-500"
                              }`}
                            >
                              Rs. {money(cust.balanceAmount)}
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

                      {/* Expanded Purchased Items Details */}
                      {isExpanded && (
                        <div className="border-t bg-slate-50/40 p-4 md:p-5">
                          {detailMode === "GROUPED" ? (
                            <div>
                              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                                All Items Purchased by {cust.customerName} (Grouped Summary)
                              </h4>
                              <div className="touch-pan-x overscroll-x-contain overflow-x-auto rounded-xl border bg-white">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                                    <tr>
                                      <th className="px-4 py-3">Item Code</th>
                                      <th className="px-4 py-3">Item Name</th>
                                      <th className="px-4 py-3">Type</th>
                                      <th className="px-4 py-3">Category</th>
                                      <th className="px-4 py-3 text-right">
                                        Total Qty
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
                                    {cust.groupedItems.map((item) => (
                                      <tr
                                        key={item.itemKey}
                                        className="hover:bg-slate-50/80"
                                      >
                                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">
                                          {item.itemCode}
                                        </td>
                                        <td className="px-4 py-2.5 font-semibold text-slate-900">
                                          {item.itemName}
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                              item.itemType === "PRODUCT"
                                                ? "bg-blue-50 text-blue-700"
                                                : item.itemType === "SERVICE"
                                                  ? "bg-purple-50 text-purple-700"
                                                  : "bg-slate-100 text-slate-600"
                                            }`}
                                          >
                                            {item.itemType}
                                          </span>
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
                                        <td className="px-4 py-2.5 text-right text-slate-600">
                                          Rs. {money(item.totalDiscount)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-black text-slate-900">
                                          Rs. {money(item.totalValue)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="border-t bg-slate-50 font-bold text-slate-900">
                                    <tr>
                                      <td
                                        colSpan={4}
                                        className="px-4 py-2.5 text-right text-xs uppercase text-slate-500"
                                      >
                                        Customer Total (Before Invoice-Level Discounts)
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        {qtyFormat(cust.totalQuantity)}
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        Rs. {money(cust.discount)}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-black text-blue-600">
                                        Rs. {money(cust.totalValue)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                                Detailed Invoice-Wise Item History for {cust.customerName}
                              </h4>
                              <div className="touch-pan-x overscroll-x-contain overflow-x-auto rounded-xl border bg-white">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                                    <tr>
                                      <th className="px-4 py-3">Date</th>
                                      <th className="px-4 py-3">Invoice No</th>
                                      <th className="px-4 py-3">Item Code</th>
                                      <th className="px-4 py-3">Item Name</th>
                                      <th className="px-4 py-3">Category</th>
                                      <th className="px-4 py-3 text-right">Qty</th>
                                      <th className="px-4 py-3 text-right">
                                        Unit Price
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
                                    {cust.purchases.map((p, idx) => (
                                      <tr
                                        key={`${p.saleId}-${p.itemKey}-${idx}`}
                                        className="hover:bg-slate-50/80"
                                      >
                                        <td className="px-4 py-2.5 text-xs text-slate-600">
                                          {new Date(p.saleDate).toLocaleDateString(
                                            "en-LK"
                                          )}
                                        </td>
                                        <td className="px-4 py-2.5 font-mono text-xs font-bold text-blue-600">
                                          {p.invoiceNo}
                                        </td>
                                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700">
                                          {p.itemCode}
                                        </td>
                                        <td className="px-4 py-2.5 font-semibold text-slate-900">
                                          {p.itemName}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-slate-600">
                                          {p.categoryName}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                                          {qtyFormat(p.quantity)}{" "}
                                          <span className="text-xs font-normal text-slate-500">
                                            {p.unitName}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-slate-700">
                                          Rs. {money(p.unitPrice)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-slate-600">
                                          Rs. {money(p.discount)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-black text-slate-900">
                                          Rs. {money(p.total)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  totalRecords={pagination.totalRecords}
                  pageSize={pagination.pageSize}
                  onPageChange={pagination.handlePageChange}
                  onPageSizeChange={pagination.handlePageSizeChange}
                  startIndex={pagination.startIndex}
                  endIndex={pagination.endIndex}
                  recordLabel="customers"
                  className="rounded-2xl border"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

