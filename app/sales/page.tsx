"use client";

import {
  CalendarDays,
  Eye,
  FileText,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type SaleItem = {
  id: number;
  description: string | null;
  quantity: number;
  unitPrice: number;
  costPrice: number | null;
  discount: number;
  tax: number;
  total: number;
  productId: number | null;
  serviceId: number | null;
};

type Sale = {
  id: number;
  invoiceNo: string;
  saleDate: string;

  customer: {
    id: number;
    code: string;
    name: string;
    phone: string | null;
  } | null;

  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  balanceAmount: number;

  status: string;
  paymentStatus: string;

  paymentMethod: {
    id: number;
    name: string;
    type: string;
  } | null;

  itemCount: number;
  items: SaleItem[];
};

type SalesSummary = {
  totalSales: number;
  totalPaid: number;
  totalBalance: number;
  totalDiscount: number;
  orderCount: number;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPaymentStatusClass(status: string) {
  switch (status) {
    case "PAID":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PARTIAL":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "UNPAID":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function getSaleStatusClass(status: string) {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700";

    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);

  const [summary, setSummary] = useState<SalesSummary>({
    totalSales: 0,
    totalPaid: 0,
    totalBalance: 0,
    totalDiscount: 0,
    orderCount: 0,
  });

  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSale, setSelectedSale] =
    useState<Sale | null>(null);

  async function loadSales() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (paymentStatus) {
        params.set("paymentStatus", paymentStatus);
      }

      if (status) {
        params.set("status", status);
      }

      if (dateFrom) {
        params.set("dateFrom", dateFrom);
      }

      if (dateTo) {
        params.set("dateTo", dateTo);
      }

      const queryString = params.toString();

      const response = await fetch(
        queryString
          ? `/api/sales?${queryString}`
          : "/api/sales",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load sales."
        );
      }

      setSales(result.data || []);

      setSummary(
        result.summary || {
          totalSales: 0,
          totalPaid: 0,
          totalBalance: 0,
          totalDiscount: 0,
          orderCount: 0,
        }
      );
    } catch (err) {
      console.error("LOAD SALES ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load sales."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSales();
  }, []);

  const visibleSales = useMemo(() => sales, [sales]);

  function clearFilters() {
    setSearch("");
    setPaymentStatus("");
    setStatus("");
    setDateFrom("");
    setDateTo("");

    setTimeout(() => {
      loadSales();
    }, 0);
  }

  // =========================================================
  // PRINT / REPRINT RECEIPT
  // =========================================================

  function printReceipt() {
    if (!selectedSale) {
      return;
    }

    const receiptWindow = window.open(
      "",
      "_blank",
      "width=420,height=700"
    );

    if (!receiptWindow) {
      setError(
        "Unable to open print window. Please allow pop-ups for this site."
      );

      return;
    }

    const sale = selectedSale;

    const itemsHtml = sale.items
      .map(
        (item) => `
          <tr>
            <td class="item-name">
              ${item.description || "Item"}
            </td>

            <td class="qty">
              ${item.quantity}
            </td>

            <td class="amount">
              ${formatPrice(item.total)}
            </td>
          </tr>
        `
      )
      .join("");

    receiptWindow.document.write(`
      <!DOCTYPE html>

      <html>

        <head>

          <meta charset="UTF-8" />

          <title>${sale.invoiceNo}</title>

          <style>

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family: Arial, Helvetica, sans-serif;
            }

            body {
              padding: 20px;
              font-size: 12px;
            }

            .receipt {
              width: 80mm;
              margin: 0 auto;
            }

            .center {
              text-align: center;
            }

            .shop-name {
              font-size: 18px;
              font-weight: 800;
              letter-spacing: 0.2px;
              margin-bottom: 5px;
            }

            .shop-info {
              font-size: 10px;
              line-height: 1.5;
              color: #333333;
            }

            .divider {
              border-top: 1px dashed #000000;
              margin: 10px 0;
            }

            .invoice-row {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              font-size: 11px;
              margin-bottom: 4px;
            }

            .invoice-label {
              color: #333333;
            }

            .invoice-value {
              font-weight: 600;
              text-align: right;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            th {
              padding-bottom: 5px;
              border-bottom: 1px solid #000000;
              font-size: 10px;
              font-weight: 700;
            }

            td {
              padding: 5px 0;
              vertical-align: top;
              font-size: 10px;
            }

            .item-name {
              width: 55%;
              padding-right: 5px;
              word-break: break-word;
            }

            .qty {
              width: 15%;
              text-align: center;
            }

            .amount {
              width: 30%;
              text-align: right;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 10px;
              padding: 3px 0;
              font-size: 11px;
            }

            .summary-label {
              color: #333333;
            }

            .summary-value {
              text-align: right;
            }

            .grand-total {
              margin-top: 5px;
              padding-top: 7px;
              border-top: 1px solid #000000;
              font-size: 15px;
              font-weight: 800;
            }

            .payment-status {
              margin-top: 3px;
              font-size: 10px;
              text-align: right;
            }

            .footer {
              margin-top: 15px;
              text-align: center;
              font-size: 10px;
              line-height: 1.5;
            }

            .thank-you {
              font-weight: 700;
              margin-bottom: 3px;
            }

            @page {
              size: 80mm auto;
              margin: 0;
            }

            @media print {

              html,
              body {
                width: 80mm;
                padding: 0;
              }

              body {
                padding: 0;
              }

              .receipt {
                width: 80mm;
                margin: 0;
              }

            }

          </style>

        </head>

        <body>

          <div class="receipt">

            <!-- SHOP HEADER -->

            <div class="center">

              <div class="shop-name">
                PUBUDU CREATIVE HUB
              </div>

              <div class="shop-info">
                Printing • Designing • Stationery<br />
                Photocopy • Laminating • Binding<br />
                Phone Accessories
              </div>

            </div>

            <div class="divider"></div>

            <!-- SALE INFORMATION -->

            <div class="invoice-row">
              <span class="invoice-label">
                Invoice
              </span>

              <span class="invoice-value">
                ${sale.invoiceNo}
              </span>
            </div>

            <div class="invoice-row">
              <span class="invoice-label">
                Date
              </span>

              <span class="invoice-value">
                ${formatDate(sale.saleDate)}
              </span>
            </div>

            <div class="invoice-row">
              <span class="invoice-label">
                Time
              </span>

              <span class="invoice-value">
                ${formatTime(sale.saleDate)}
              </span>
            </div>

            <div class="invoice-row">
              <span class="invoice-label">
                Customer
              </span>

              <span class="invoice-value">
                ${
                  sale.customer?.name ||
                  "Walk-in Customer"
                }
              </span>
            </div>

            ${
              sale.customer?.phone
                ? `
                  <div class="invoice-row">
                    <span class="invoice-label">
                      Phone
                    </span>

                    <span class="invoice-value">
                      ${sale.customer.phone}
                    </span>
                  </div>
                `
                : ""
            }

            <div class="divider"></div>

            <!-- ITEMS -->

            <table>

              <thead>

                <tr>

                  <th
                    style="text-align:left;"
                  >
                    Item
                  </th>

                  <th
                    style="text-align:center;"
                  >
                    Qty
                  </th>

                  <th
                    style="text-align:right;"
                  >
                    Amount
                  </th>

                </tr>

              </thead>

              <tbody>

                ${itemsHtml}

              </tbody>

            </table>

            <div class="divider"></div>

            <!-- TOTALS -->

            <div class="summary-row">

              <span class="summary-label">
                Subtotal
              </span>

              <span class="summary-value">
                Rs. ${formatPrice(
                  sale.subtotal
                )}
              </span>

            </div>

            ${
              sale.tax > 0
                ? `
                  <div class="summary-row">

                    <span class="summary-label">
                      Tax
                    </span>

                    <span class="summary-value">
                      Rs. ${formatPrice(
                        sale.tax
                      )}
                    </span>

                  </div>
                `
                : ""
            }

            ${
              sale.discount > 0
                ? `
                  <div class="summary-row">

                    <span class="summary-label">
                      Discount
                    </span>

                    <span class="summary-value">
                      - Rs. ${formatPrice(
                        sale.discount
                      )}
                    </span>

                  </div>
                `
                : ""
            }

            <div class="summary-row grand-total">

              <span>
                TOTAL
              </span>

              <span>
                Rs. ${formatPrice(
                  sale.total
                )}
              </span>

            </div>

            <div class="summary-row">

              <span class="summary-label">
                Payment
              </span>

              <span class="summary-value">
                ${
                  sale.paymentMethod?.name ||
                  "—"
                }
              </span>

            </div>

            <div class="summary-row">

              <span class="summary-label">
                Paid
              </span>

              <span class="summary-value">
                Rs. ${formatPrice(
                  sale.paidAmount
                )}
              </span>

            </div>

            ${
              sale.balanceAmount > 0
                ? `
                  <div class="summary-row">

                    <span
                      style="
                        font-weight:700;
                        color:#b45309;
                      "
                    >
                      Balance
                    </span>

                    <span
                      style="
                        font-weight:700;
                        color:#b45309;
                      "
                    >
                      Rs. ${formatPrice(
                        sale.balanceAmount
                      )}
                    </span>

                  </div>
                `
                : ""
            }

            <div class="payment-status">
              Payment Status:
              <strong>
                ${sale.paymentStatus}
              </strong>
            </div>

            <div class="divider"></div>

            <!-- FOOTER -->

            <div class="footer">

              <div class="thank-you">
                Thank you for your business!
              </div>

              <div>
                Please keep this receipt
                for your records.
              </div>

              <div style="margin-top:5px;">
                PUBUDU CREATIVE HUB
              </div>

            </div>

          </div>

          <script>

            window.onload = function () {

              setTimeout(function () {

                window.focus();

                window.print();

              }, 300);

            };

          </script>

        </body>

      </html>
    `);

    receiptWindow.document.close();
  }

  return (
    <div className="min-h-full bg-background">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="border-b border-border bg-card">

        <div className="px-6 py-5">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <FileText className="h-5 w-5 text-primary" />

                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  Sales
                </h1>

              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                View and manage completed sales
              </p>

            </div>

            <button
              type="button"
              onClick={loadSales}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >

              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />

              Refresh

            </button>

          </div>

        </div>

      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="space-y-6 p-6">

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* TOTAL SALES */}

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Sales
            </p>

            <p className="mt-2 text-2xl font-black text-foreground">
              Rs. {formatPrice(summary.totalSales)}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {summary.orderCount} orders
            </p>

          </div>

          {/* PAID */}

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Paid
            </p>

            <p className="mt-2 text-2xl font-black text-emerald-600">
              Rs. {formatPrice(summary.totalPaid)}
            </p>

          </div>

          {/* OUTSTANDING */}

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Outstanding
            </p>

            <p className="mt-2 text-2xl font-black text-amber-600">
              Rs. {formatPrice(summary.totalBalance)}
            </p>

          </div>

          {/* DISCOUNTS */}

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Discounts
            </p>

            <p className="mt-2 text-2xl font-black text-foreground">
              Rs. {formatPrice(summary.totalDiscount)}
            </p>

          </div>

        </div>

        {/* =================================================
            FILTERS
        ================================================= */}

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">

          <div className="grid gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">

            {/* SEARCH */}

            <div className="relative">

              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                onKeyDown={(event) => {

                  if (event.key === "Enter") {
                    loadSales();
                  }

                }}
                placeholder="Search invoice, customer or phone..."
                className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
              />

            </div>

            {/* PAYMENT STATUS */}

            <select
              value={paymentStatus}
              onChange={(event) => {

                setPaymentStatus(event.target.value);

                setTimeout(() => {
                  loadSales();
                }, 0);

              }}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >

              <option value="">
                All Payment Status
              </option>

              <option value="PAID">
                Paid
              </option>

              <option value="PARTIAL">
                Partial
              </option>

              <option value="UNPAID">
                Unpaid
              </option>

            </select>

            {/* SALE STATUS */}

            <select
              value={status}
              onChange={(event) => {

                setStatus(event.target.value);

                setTimeout(() => {
                  loadSales();
                }, 0);

              }}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >

              <option value="">
                All Sale Status
              </option>

              <option value="COMPLETED">
                Completed
              </option>

              <option value="PENDING">
                Pending
              </option>

              <option value="CANCELLED">
                Cancelled
              </option>

            </select>

            {/* DATE FROM */}

            <div className="relative">

              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                type="date"
                value={dateFrom}
                onChange={(event) =>
                  setDateFrom(event.target.value)
                }
                className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />

            </div>

            {/* DATE TO */}

            <div className="relative">

              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                type="date"
                value={dateTo}
                onChange={(event) =>
                  setDateTo(event.target.value)
                }
                className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />

            </div>

            {/* SEARCH BUTTON */}

            <button
              type="button"
              onClick={loadSales}
              className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              Search
            </button>

          </div>

          <div className="mt-3 flex justify-end">

            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Clear filters
            </button>

          </div>

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>

        )}

        {/* =================================================
            SALES HISTORY
        ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">

          <div className="flex items-center justify-between border-b border-border px-5 py-4">

            <div>

              <h2 className="text-base font-black text-foreground">
                Sales History
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                {visibleSales.length} sales found
              </p>

            </div>

          </div>

          {/* LOADING */}

          {loading ? (

            <div className="flex min-h-[350px] items-center justify-center">

              <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">

                <RefreshCw className="h-5 w-5 animate-spin text-primary" />

                Loading sales...

              </div>

            </div>

          ) : visibleSales.length === 0 ? (

            /* EMPTY */

            <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">

                <FileText className="h-6 w-6 text-muted-foreground" />

              </div>

              <h3 className="mt-4 text-sm font-bold text-foreground">
                No sales found
              </h3>

              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Try changing your search or filter options.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1050px]">

                <thead>

                  <tr className="border-b border-border bg-muted/40">

                    <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Invoice
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Customer
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Payment
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Total
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Paid
                    </th>

                    <th className="px-5 py-3 text-center text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>

                    <th className="px-5 py-3 text-center text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {visibleSales.map((sale) => (

                    <tr
                      key={sale.id}
                      className="border-b border-border last:border-b-0 transition hover:bg-muted/30"
                    >

                      {/* INVOICE */}

                      <td className="px-5 py-4">

                        <div className="font-bold text-foreground">
                          {sale.invoiceNo}
                        </div>

                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Sale #{sale.id}
                        </div>

                      </td>

                      {/* CUSTOMER */}

                      <td className="px-5 py-4">

                        <div className="font-semibold text-foreground">
                          {sale.customer?.name ||
                            "Walk-in Customer"}
                        </div>

                        {sale.customer?.phone && (

                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {sale.customer.phone}
                          </div>

                        )}

                      </td>

                      {/* DATE */}

                      <td className="px-5 py-4">

                        <div className="font-medium text-foreground">
                          {formatDate(
                            sale.saleDate
                          )}
                        </div>

                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {formatTime(
                            sale.saleDate
                          )}
                        </div>

                      </td>

                      {/* PAYMENT */}

                      <td className="px-5 py-4">

                        <div className="font-semibold text-foreground">
                          {sale.paymentMethod?.name ||
                            "—"}
                        </div>

                        <span
                          className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${getPaymentStatusClass(
                            sale.paymentStatus
                          )}`}
                        >
                          {sale.paymentStatus}
                        </span>

                      </td>

                      {/* TOTAL */}

                      <td className="px-5 py-4 text-right">

                        <div className="font-black text-foreground">
                          Rs.{" "}
                          {formatPrice(
                            sale.total
                          )}
                        </div>

                        {sale.discount > 0 && (

                          <div className="mt-1 text-[11px] text-red-500">
                            - Rs.{" "}
                            {formatPrice(
                              sale.discount
                            )}
                          </div>

                        )}

                      </td>

                      {/* PAID */}

                      <td className="px-5 py-4 text-right">

                        <div className="font-bold text-emerald-600">
                          Rs.{" "}
                          {formatPrice(
                            sale.paidAmount
                          )}
                        </div>

                        {sale.balanceAmount > 0 && (

                          <div className="mt-1 text-[11px] font-semibold text-amber-600">
                            Due Rs.{" "}
                            {formatPrice(
                              sale.balanceAmount
                            )}
                          </div>

                        )}

                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4 text-center">

                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${getSaleStatusClass(
                            sale.status
                          )}`}
                        >
                          {sale.status}
                        </span>

                      </td>

                      {/* ACTION */}

                      <td className="px-5 py-4 text-center">

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSale(sale)
                          }
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-bold text-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                        >

                          <Eye className="h-4 w-4" />

                          View

                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>

      {/* =====================================================
          SALE DETAILS MODAL
      ===================================================== */}

      {selectedSale && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedSale(null);
            }

          }}
        >

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-start justify-between border-b border-border p-5">

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sale Details
                </p>

                <h2 className="mt-1 text-xl font-black text-foreground">
                  {selectedSale.invoiceNo}
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(
                    selectedSale.saleDate
                  )}{" "}
                  •{" "}
                  {formatTime(
                    selectedSale.saleDate
                  )}
                </p>

              </div>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  onClick={printReceipt}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
                >
                  <Printer className="h-4 w-4" />

                  Receipt

                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedSale(null)
                  }
                  className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-muted"
                >
                  Close
                </button>

              </div>

            </div>

            {/* MODAL CONTENT */}

            <div className="space-y-5 p-5">

              {/* CUSTOMER + PAYMENT */}

              <div className="grid gap-4 sm:grid-cols-2">

                {/* CUSTOMER */}

                <div className="rounded-xl bg-muted/50 p-4">

                  <p className="text-[11px] font-bold uppercase text-muted-foreground">
                    Customer
                  </p>

                  <p className="mt-1 font-bold text-foreground">
                    {selectedSale.customer?.name ||
                      "Walk-in Customer"}
                  </p>

                  {selectedSale.customer?.phone && (

                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedSale.customer.phone}
                    </p>

                  )}

                </div>

                {/* PAYMENT */}

                <div className="rounded-xl bg-muted/50 p-4">

                  <p className="text-[11px] font-bold uppercase text-muted-foreground">
                    Payment
                  </p>

                  <p className="mt-1 font-bold text-foreground">
                    {selectedSale.paymentMethod?.name ||
                      "—"}
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${getPaymentStatusClass(
                      selectedSale.paymentStatus
                    )}`}
                  >
                    {selectedSale.paymentStatus}
                  </span>

                </div>

              </div>

              {/* ITEMS */}

              <div>

                <div className="mb-3 flex items-center justify-between">

                  <h3 className="text-sm font-black text-foreground">
                    Items
                  </h3>

                  <span className="text-xs font-semibold text-muted-foreground">
                    {selectedSale.itemCount} items
                  </span>

                </div>

                <div className="overflow-hidden rounded-xl border border-border">

                  <table className="w-full">

                    <thead className="bg-muted/40">

                      <tr>

                        <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">
                          Item
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground">
                          Qty
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground">
                          Price
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground">
                          Total
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {selectedSale.items.map(
                        (item) => (

                          <tr
                            key={item.id}
                            className="border-t border-border"
                          >

                            <td className="px-4 py-3">

                              <div className="text-sm font-semibold text-foreground">
                                {item.description ||
                                  "Item"}
                              </div>

                              {item.productId && (

                                <div className="mt-1 text-[10px] text-muted-foreground">
                                  Product #
                                  {item.productId}
                                </div>

                              )}

                              {item.serviceId && (

                                <div className="mt-1 text-[10px] text-muted-foreground">
                                  Service #
                                  {item.serviceId}
                                </div>

                              )}

                            </td>

                            <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                              {item.quantity}
                            </td>

                            <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                              Rs.{" "}
                              {formatPrice(
                                item.unitPrice
                              )}
                            </td>

                            <td className="px-4 py-3 text-right text-sm font-bold text-foreground">
                              Rs.{" "}
                              {formatPrice(
                                item.total
                              )}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              {/* TOTALS */}

              <div className="ml-auto max-w-sm space-y-2">

                <div className="flex justify-between text-sm">

                  <span className="text-muted-foreground">
                    Subtotal
                  </span>

                  <span className="font-semibold">
                    Rs.{" "}
                    {formatPrice(
                      selectedSale.subtotal
                    )}
                  </span>

                </div>

                {selectedSale.tax > 0 && (

                  <div className="flex justify-between text-sm">

                    <span className="text-muted-foreground">
                      Tax
                    </span>

                    <span className="font-semibold">
                      Rs.{" "}
                      {formatPrice(
                        selectedSale.tax
                      )}
                    </span>

                  </div>

                )}

                <div className="flex justify-between text-sm">

                  <span className="text-muted-foreground">
                    Discount
                  </span>

                  <span className="font-semibold text-red-500">
                    - Rs.{" "}
                    {formatPrice(
                      selectedSale.discount
                    )}
                  </span>

                </div>

                <div className="flex justify-between border-t border-border pt-3 text-lg">

                  <span className="font-black">
                    Total
                  </span>

                  <span className="font-black">
                    Rs.{" "}
                    {formatPrice(
                      selectedSale.total
                    )}
                  </span>

                </div>

                <div className="flex justify-between text-sm">

                  <span className="text-muted-foreground">
                    Paid
                  </span>

                  <span className="font-bold text-emerald-600">
                    Rs.{" "}
                    {formatPrice(
                      selectedSale.paidAmount
                    )}
                  </span>

                </div>

                {selectedSale.balanceAmount > 0 && (

                  <div className="flex justify-between text-sm">

                    <span className="font-semibold text-amber-600">
                      Balance
                    </span>

                    <span className="font-black text-amber-600">
                      Rs.{" "}
                      {formatPrice(
                        selectedSale.balanceAmount
                      )}
                    </span>

                  </div>

                )}

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}