"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  FileBarChart,
  Package,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Users,
} from "lucide-react";

import SalesOverviewChart from "./SalesOverviewChart";
import CategorySalesChart from "./CategorySalesChart";
import PaymentMethodsChart from "./PaymentMethodsChart";
import TopSellingProductsChart from "./TopSellingProductsChart";

/* ============================================================
   TYPES
============================================================ */

type DashboardUser = {
  id: number;
  username: string;
  fullName: string;
  role: {
    id: number;
    name: string;
  };
};

type DashboardPeriod =
  | "today"
  | "7days"
  | "30days"
  | "month"
  | "year";

type DashboardData = {
  period: {
    selected: DashboardPeriod;
    start: string;
    end: string;
  };

  summary: {
    todaySales: number;
    todayPaid: number;
    todayOrders: number;

    yesterdaySales: number;
    yesterdayOrders: number;

    salesChange: number;
    ordersChange: number;

    periodSales: number;
    periodPaid: number;
    periodOrders: number;

    previousPeriodSales: number;
    previousPeriodOrders: number;

    periodSalesChange: number;
    periodOrdersChange: number;

    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;

    totalPayments: number;
  };

  salesOverview: {
    date: string;
    sales: number;
  }[];

  salesByCategory: {
    name: string;
    value: number;
  }[];

  paymentMethods: {
    name: string;
    value: number;
  }[];

  topSellingProducts: {
    name: string;
    quantity: number;
    revenue: number;
  }[];

  recentSales: {
    id: number;
    invoiceNo: string;
    saleDate: string;
    total: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    paymentStatus: string;
    customer: {
      name: string;
    } | null;
  }[];

  lowStockProducts: {
    id: number;
    name: string;
    quantity: number;
    available: number;
    minimumStock: number;
  }[];

  outOfStockProducts?: {
    id: number;
    name: string;
    quantity: number;
    available: number;
    minimumStock: number;
  }[];

  paymentStatusSummary?: {
    status: string;
    count: number;
    total: number;
  }[];
};

type DashboardClientProps = {
  user: DashboardUser;
};

/* ============================================================
   HELPERS
============================================================ */

function formatCurrency(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  return {
    date: date.toLocaleDateString("en-LK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),

    time: date.toLocaleTimeString("en-LK", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function formatPercent(value: number) {
  return `${Math.abs(Number(value || 0)).toFixed(1)}%`;
}

function getPeriodLabel(period: DashboardPeriod) {
  switch (period) {
    case "today":
      return "Today";

    case "7days":
      return "Last 7 Days";

    case "30days":
      return "Last 30 Days";

    case "month":
      return "This Month";

    case "year":
      return "This Year";

    default:
      return "Last 7 Days";
  }
}

function getSalesComparisonLabel(period: DashboardPeriod) {
  switch (period) {
    case "today":
      return "vs yesterday";

    case "7days":
      return "vs previous 7 days";

    case "30days":
      return "vs previous 30 days";

    case "month":
      return "vs previous month";

    case "year":
      return "vs previous year";

    default:
      return "vs previous period";
  }
}

/* ============================================================
   COMPONENT
============================================================ */

export default function DashboardClient({
  user,
}: DashboardClientProps) {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [period, setPeriod] =
    useState<DashboardPeriod>("7days");

  /* ==========================================================
     LOAD DASHBOARD DATA
  ========================================================== */

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/dashboard?period=${period}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Dashboard API returned ${response.status}`
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(
            result.message ||
              "Failed to load dashboard data."
          );
        }

        setData(result.data);
      } catch (err) {
        console.error(
          "Dashboard loading error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [period]);

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading && !data) {
    return (
      <main className="min-w-0">
        <div className="flex min-h-[600px] items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div
              className="
                h-8
                w-8
                animate-spin
                rounded-full
                border-2
                border-muted
                border-t-primary
              "
            />

            <p className="text-sm text-muted-foreground">
              Loading dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (error && !data) {
    return (
      <main className="min-w-0">
        <div className="p-4 sm:p-6 lg:p-8">
          <div
            className="
              rounded-2xl
              border
              border-destructive/20
              bg-destructive/10
              p-6
            "
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="
                  mt-0.5
                  h-5
                  w-5
                  text-destructive
                "
              />

              <div>
                <h2
                  className="
                    font-semibold
                    text-destructive
                  "
                >
                  Dashboard data could not be loaded
                </h2>

                <p
                  className="
                    mt-1
                    text-sm
                    text-destructive/80
                  "
                >
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    window.location.reload()
                  }
                  className="
                    mt-4
                    rounded-xl
                    bg-destructive
                    px-4
                    py-2
                    text-xs
                    font-semibold
                    text-destructive-foreground
                    transition
                    hover:bg-destructive/90
                  "
                >
                  Reload Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const salesIncrease =
    data.summary.salesChange >= 0;

  const ordersIncrease =
    data.summary.ordersChange >= 0;

  const periodSalesIncrease =
    data.summary.periodSalesChange >= 0;

  const periodOrdersIncrease =
    data.summary.periodOrdersChange >= 0;

  const periodLabel =
    getPeriodLabel(period);

  const comparisonLabel =
    getSalesComparisonLabel(period);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main className="min-w-0">
      <div className="p-4 sm:p-6 lg:p-8">

        {/* ====================================================
            PAGE HEADER
        ===================================================== */}

        <div
          className="
            mb-8
            flex
            flex-col
            justify-between
            gap-4
            md:flex-row
            md:items-center
          "
        >
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1
                className="
                  text-2xl
                  font-bold
                  tracking-tight
                  text-foreground
                "
              >
                Dashboard
              </h1>

              <span
                className="
                  rounded-full
                  bg-success/10
                  px-2.5
                  py-1
                  text-[11px]
                  font-semibold
                  text-success
                "
              >
                System Online
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              Welcome back, {user.fullName}. Here&apos;s your
              business overview.
            </p>
          </div>

          {/* HEADER ACTIONS */}

          <div className="flex flex-wrap gap-3">
            <Link
              href="/reports/sales"
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                border
                border-border
                bg-card
                px-4
                py-2.5
                text-sm
                font-medium
                text-foreground
                shadow-sm
                transition
                hover:bg-accent
              "
            >
              <FileBarChart className="h-4 w-4" />

              Reports
            </Link>

            <Link
              href="/pos"
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-primary
                px-4
                py-2.5
                text-sm
                font-semibold
                text-primary-foreground
                shadow-sm
                transition
                hover:bg-primary/90
              "
            >
              <Plus className="h-4 w-4" />

              New Sale
            </Link>
          </div>
        </div>

        {/* ====================================================
            KPI CARDS
        ===================================================== */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* PERIOD SALES */}

          <div
            className="
              rounded-2xl
              border
              border-border
              bg-card
              p-5
              shadow-sm
              transition
              hover:shadow-md
            "
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {periodLabel} Sales
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(
                    data.summary.periodSales
                  )}
                </p>
              </div>

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary/10
                  text-primary
                "
              >
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1 text-xs">
              {periodSalesIncrease ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-success" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
              )}

              <span
                className={
                  periodSalesIncrease
                    ? "font-medium text-success"
                    : "font-medium text-destructive"
                }
              >
                {formatPercent(
                  data.summary.periodSalesChange
                )}
              </span>

              <span className="text-muted-foreground">
                {comparisonLabel}
              </span>
            </div>
          </div>

          {/* PERIOD ORDERS */}

          <div
            className="
              rounded-2xl
              border
              border-border
              bg-card
              p-5
              shadow-sm
              transition
              hover:shadow-md
            "
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {periodLabel} Orders
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {data.summary.periodOrders}
                </p>
              </div>

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-chart-4/10
                  text-chart-4
                "
              >
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1 text-xs">
              {periodOrdersIncrease ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-success" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
              )}

              <span
                className={
                  periodOrdersIncrease
                    ? "font-medium text-success"
                    : "font-medium text-destructive"
                }
              >
                {formatPercent(
                  data.summary.periodOrdersChange
                )}
              </span>

              <span className="text-muted-foreground">
                {comparisonLabel}
              </span>
            </div>
          </div>

          {/* TOTAL PRODUCTS */}

          <div
            className="
              rounded-2xl
              border
              border-border
              bg-card
              p-5
              shadow-sm
              transition
              hover:shadow-md
            "
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Products
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {data.summary.totalProducts}
                </p>
              </div>

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-warning/15
                  text-warning
                "
              >
                <Package className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Active products in catalog
            </div>
          </div>

          {/* LOW STOCK */}

          <div
            className="
              rounded-2xl
              border
              border-border
              bg-card
              p-5
              shadow-sm
              transition
              hover:shadow-md
            "
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Low Stock Items
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {data.summary.lowStockCount}
                </p>
              </div>

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-destructive/10
                  text-destructive
                "
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>

            <div
              className={`
                mt-4
                text-xs
                font-medium
                ${
                  data.summary.lowStockCount > 0
                    ? "text-destructive"
                    : "text-success"
                }
              `}
            >
              {data.summary.lowStockCount > 0
                ? "Requires attention"
                : "Stock levels are healthy"}
            </div>
          </div>
        </div>

        {/* ====================================================
            TODAY SUMMARY
        ===================================================== */}

        <div
          className="
            mt-4
            grid
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <div
            className="
              rounded-xl
              border
              border-border
              bg-card/60
              px-4
              py-3
            "
          >
            <p className="text-[11px] text-muted-foreground">
              Today&apos;s Sales
            </p>

            <p className="mt-1 text-sm font-bold text-foreground">
              {formatCurrency(
                data.summary.todaySales
              )}
            </p>
          </div>

          <div
            className="
              rounded-xl
              border
              border-border
              bg-card/60
              px-4
              py-3
            "
          >
            <p className="text-[11px] text-muted-foreground">
              Today&apos;s Orders
            </p>

            <p className="mt-1 text-sm font-bold text-foreground">
              {data.summary.todayOrders}
            </p>
          </div>

          <div
            className="
              rounded-xl
              border
              border-border
              bg-card/60
              px-4
              py-3
            "
          >
            <p className="text-[11px] text-muted-foreground">
              Today&apos;s Paid
            </p>

            <p className="mt-1 text-sm font-bold text-foreground">
              {formatCurrency(
                data.summary.todayPaid
              )}
            </p>
          </div>

          <div
            className="
              rounded-xl
              border
              border-border
              bg-card/60
              px-4
              py-3
            "
          >
            <p className="text-[11px] text-muted-foreground">
              Outstanding Stock Alerts
            </p>

            <p className="mt-1 text-sm font-bold text-foreground">
              {data.summary.outOfStockCount} Out of Stock
            </p>
          </div>
        </div>

        {/* ====================================================
            SALES CHART + QUICK ACTIONS
        ===================================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-3">

          {/* SALES OVERVIEW */}

          <div
            className="
              relative
              rounded-2xl
              border
              border-border
              bg-card
              p-6
              shadow-sm
              xl:col-span-2
            "
          >
            <div
              className="
                flex
                flex-col
                justify-between
                gap-3
                sm:flex-row
                sm:items-center
              "
            >
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Sales Overview
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  Real sales performance from your database
                </p>
              </div>

              <select
                value={period}
                onChange={(event) =>
                  setPeriod(
                    event.target.value as DashboardPeriod
                  )
                }
                className="
                  rounded-xl
                  border
                  border-border
                  bg-background
                  px-3
                  py-2
                  text-xs
                  font-medium
                  text-foreground
                  outline-none
                  transition
                  focus:border-primary
                  focus:ring-2
                  focus:ring-primary/20
                "
              >
                <option value="today">
                  Today
                </option>

                <option value="7days">
                  Last 7 Days
                </option>

                <option value="30days">
                  Last 30 Days
                </option>

                <option value="month">
                  This Month
                </option>

                <option value="year">
                  This Year
                </option>
              </select>
            </div>

            <div className="mt-6">
              <SalesOverviewChart
  data={data.salesOverview}
  period={period}
/>
            </div>

            {/* REFRESHING OVERLAY */}

            {loading && (
              <div
                className="
                  absolute
                  inset-0
                  z-10
                  flex
                  items-center
                  justify-center
                  rounded-2xl
                  bg-background/40
                  backdrop-blur-[1px]
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-border
                    bg-card
                    px-4
                    py-2.5
                    text-xs
                    font-medium
                    text-muted-foreground
                    shadow-sm
                  "
                >
                  <div
                    className="
                      h-4
                      w-4
                      animate-spin
                      rounded-full
                      border-2
                      border-muted
                      border-t-primary
                    "
                  />

                  Updating dashboard...
                </div>
              </div>
            )}
          </div>

          {/* QUICK ACTIONS */}

          <div
            className="
              rounded-2xl
              border
              border-border
              bg-card
              p-6
              shadow-sm
            "
          >
            <h2 className="text-base font-semibold text-foreground">
              Quick Actions
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Frequently used operations
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">

              <Link
                href="/pos"
                className="
                  flex
                  flex-col
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-border
                  p-4
                  text-center
                  transition
                  hover:border-primary/30
                  hover:bg-accent
                "
              >
                <ShoppingCart className="h-5 w-5 text-primary" />

                <span className="mt-2 text-xs font-medium text-foreground">
                  New Sale
                </span>
              </Link>

              <Link
                href="/products"
                className="
                  flex
                  flex-col
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-border
                  p-4
                  text-center
                  transition
                  hover:border-primary/30
                  hover:bg-accent
                "
              >
                <Package className="h-5 w-5 text-primary" />

                <span className="mt-2 text-xs font-medium text-foreground">
                  Add Product
                </span>
              </Link>

              <Link
                href="/purchases"
                className="
                  flex
                  flex-col
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-border
                  p-4
                  text-center
                  transition
                  hover:border-primary/30
                  hover:bg-accent
                "
              >
                <ShoppingBag className="h-5 w-5 text-primary" />

                <span className="mt-2 text-xs font-medium text-foreground">
                  Purchase
                </span>
              </Link>

              <Link
                href="/reports/sales"
                className="
                  flex
                  flex-col
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-border
                  p-4
                  text-center
                  transition
                  hover:border-primary/30
                  hover:bg-accent
                "
              >
                <FileBarChart className="h-5 w-5 text-primary" />

                <span className="mt-2 text-xs font-medium text-foreground">
                  Reports
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* ====================================================
            CATEGORY + PAYMENT
        ===================================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-2">

          {/* SALES BY CATEGORY */}

          <div
            className="
              rounded-2xl
              border
              border-border
              bg-card
              p-6
              shadow-sm
            "
          >
            <h2 className="text-base font-semibold text-foreground">
              Sales by Category
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Revenue distribution by business category
            </p>

            <div className="mt-4">
              <CategorySalesChart
                data={data.salesByCategory}
              />
            </div>
          </div>

          {/* PAYMENT METHODS */}

          <div
            className="
              rounded-2xl
              border
              border-border
              bg-card
              p-6
              shadow-sm
            "
          >
            <h2 className="text-base font-semibold text-foreground">
              Payment Methods
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Real payment distribution from database
            </p>

            <div className="mt-4">
              <PaymentMethodsChart
                data={data.paymentMethods}
              />
            </div>

            <div
              className="
                mt-3
                flex
                items-center
                justify-between
                rounded-xl
                border
                border-border
                bg-muted/20
                px-4
                py-3
              "
            >
              <span className="text-xs font-medium text-muted-foreground">
                Total Payments
              </span>

              <span className="text-sm font-bold text-foreground">
                {formatCurrency(
                  data.summary.totalPayments
                )}
              </span>
            </div>
          </div>
        </div>

        {/* ====================================================
            TOP SELLING PRODUCTS
        ===================================================== */}

        <div
          className="
            mt-6
            rounded-2xl
            border
            border-border
            bg-card
            p-6
            shadow-sm
          "
        >
          <h2 className="text-base font-semibold text-foreground">
            Top Selling Products
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Best performing products and services by quantity sold
          </p>

          <div className="mt-4">
            <TopSellingProductsChart
              data={data.topSellingProducts}
            />
          </div>
        </div>

        {/* ====================================================
            RECENT SALES + LOW STOCK
        ===================================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-3">

          {/* RECENT SALES */}

          <div
            className="
              overflow-hidden
              rounded-2xl
              border
              border-border
              bg-card
              shadow-sm
              xl:col-span-2
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3
                border-b
                border-border
                px-6
                py-5
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Recent Sales
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  Latest sales transactions
                </p>
              </div>

              <Link
                href="/sales"
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  text-xs
                  font-semibold
                  text-primary
                  transition
                  hover:text-primary/80
                "
              >
                View all

                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">

                <thead
                  className="
                    border-b
                    border-border
                    bg-muted/40
                    text-[11px]
                    uppercase
                    tracking-wide
                    text-muted-foreground
                  "
                >
                  <tr>
                    <th className="px-6 py-3 font-semibold">
                      Invoice
                    </th>

                    <th className="px-6 py-3 font-semibold">
                      Customer
                    </th>

                    <th className="px-6 py-3 font-semibold">
                      Date &amp; Time
                    </th>

                    <th className="px-6 py-3 text-right font-semibold">
                      Amount
                    </th>

                    <th className="px-6 py-3 font-semibold">
                      Payment
                    </th>

                    <th className="px-6 py-3 font-semibold">
                      Sale Status
                    </th>

                    <th className="px-6 py-3 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.recentSales.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="
                          px-6
                          py-10
                          text-center
                          text-sm
                          text-muted-foreground
                        "
                      >
                        No sales found.
                      </td>
                    </tr>
                  ) : (
                    data.recentSales.map((sale) => {
                      const dateTime =
                        formatDateTime(
                          sale.saleDate
                        );

                      return (
                        <tr
                          key={sale.id}
                          className="
                            border-b
                            border-border
                            transition
                            hover:bg-muted/30
                          "
                        >
                          <td className="px-6 py-4">
                            <p className="font-semibold text-foreground">
                              {sale.invoiceNo}
                            </p>

                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              #{String(
                                sale.id
                              ).padStart(4, "0")}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <p className="font-medium text-foreground">
                              {sale.customer?.name ||
                                "Walk-in Customer"}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <p className="text-sm text-foreground">
                              {dateTime.date}
                            </p>

                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {dateTime.time}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <p className="font-semibold text-foreground">
                              {formatCurrency(
                                sale.total
                              )}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`
                                inline-flex
                                items-center
                                rounded-full
                                px-2.5
                                py-1
                                text-[11px]
                                font-semibold
                                ${
                                  sale.paymentStatus ===
                                  "PAID"
                                    ? "bg-success/10 text-success"
                                    : "bg-warning/15 text-warning-foreground"
                                }
                              `}
                            >
                              {sale.paymentStatus}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`
                                inline-flex
                                items-center
                                rounded-full
                                px-2.5
                                py-1
                                text-[11px]
                                font-semibold
                                ${
                                  sale.status ===
                                  "COMPLETED"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-warning/15 text-warning-foreground"
                                }
                              `}
                            >
                              {sale.status}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <Link
                              href="/sales"
                              className="
                                inline-flex
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-border
                                px-2.5
                                py-1.5
                                text-xs
                                font-medium
                                text-foreground
                                transition
                                hover:bg-accent
                              "
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* LOW STOCK */}

          <div
            className="
              rounded-2xl
              border
              border-border
              bg-card
              shadow-sm
            "
          >
            <div className="border-b border-border px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Low Stock
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Products requiring attention
                  </p>
                </div>

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    bg-destructive/10
                    text-destructive
                  "
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="space-y-5 p-6">

              {data.lowStockProducts.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-success">
                    All stock levels are healthy.
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    No products require attention.
                  </p>
                </div>
              ) : (
                data.lowStockProducts.map((product) => {
                  const minimum =
                    Number(
                      product.minimumStock
                    ) || 0;

                  const current =
                    Number(
                      product.available
                    ) || 0;

                  const percentage =
                    minimum > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (current / minimum) *
                              100
                          )
                        )
                      : 0;

                  const critical =
                    current <=
                    minimum * 0.5;

                  return (
                    <div key={product.id}>

                      <div className="flex items-center justify-between gap-3">

                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {product.name}
                          </p>

                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Current: {current} / Minimum: {minimum}
                          </p>
                        </div>

                        <span
                          className={`
                            rounded-full
                            px-2.5
                            py-1
                            text-[11px]
                            font-semibold
                            ${
                              critical
                                ? "bg-destructive/10 text-destructive"
                                : "bg-warning/15 text-warning-foreground"
                            }
                          `}
                        >
                          {critical
                            ? "Critical"
                            : "Low"}
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`
                            h-full
                            rounded-full
                            ${
                              critical
                                ? "bg-destructive"
                                : "bg-warning"
                            }
                          `}
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      <div className="mt-1.5 flex justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          Stock level
                        </span>

                        <span
                          className={`
                            text-[10px]
                            font-medium
                            ${
                              critical
                                ? "text-destructive"
                                : "text-warning-foreground"
                            }
                          `}
                        >
                          {percentage}%
                        </span>
                      </div>

                    </div>
                  );
                })
              )}

              <Link
                href="/inventory"
                className="
                  mt-2
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-border
                  px-3
                  py-2.5
                  text-xs
                  font-semibold
                  text-foreground
                  transition
                  hover:border-primary/30
                  hover:bg-accent
                "
              >
                View Inventory

                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ====================================================
            SYSTEM INFORMATION
        ===================================================== */}

        <div
          className="
            mt-6
            rounded-2xl
            border
            border-border
            bg-card
            p-6
            shadow-sm
          "
        >
          <div
            className="
              flex
              flex-col
              justify-between
              gap-4
              sm:flex-row
              sm:items-center
            "
          >
            <div>
              <h2 className="text-base font-semibold text-foreground">
                System Access
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Current authenticated account information
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  bg-primary/10
                  text-primary
                "
              >
                <Users className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground">
                  {user.fullName}
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <span
                    className="
                      rounded-full
                      bg-muted
                      px-2
                      py-0.5
                      text-[10px]
                      font-semibold
                      text-muted-foreground
                    "
                  >
                    {user.role.name}
                  </span>

                  <span className="flex items-center gap-1 text-[10px] text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />

                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================
            FOOTER
        ===================================================== */}

        <footer className="mt-8 pb-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Pubudu POS. All rights reserved.
        </footer>
      </div>
    </main>
  );
}