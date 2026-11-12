"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

type MovementType =
  | "PURCHASE"
  | "SALE"
  | "SALE_RETURN"
  | "PURCHASE_RETURN"
  | "ADJUSTMENT"
  | "DAMAGE"
  | "OPENING_STOCK"
  | "JOB_CONSUMPTION";

type MovementItem = {
  id: string;
  productId: number;
  product: {
    id: number;
    code: string;
    name: string;
    barcode: string | null;
    unit: string;
  };
  type: MovementType;
  quantity: number;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
};

const movementTypes: {
  value: MovementType;
  label: string;
}[] = [
  {
    value: "PURCHASE",
    label: "Purchase",
  },
  {
    value: "SALE",
    label: "Sale",
  },
  {
    value: "SALE_RETURN",
    label: "Sale Return",
  },
  {
    value: "PURCHASE_RETURN",
    label: "Purchase Return",
  },
  {
    value: "ADJUSTMENT",
    label: "Adjustment",
  },
  {
    value: "DAMAGE",
    label: "Damage",
  },
  {
    value: "OPENING_STOCK",
    label: "Opening Stock",
  },
  {
    value: "JOB_CONSUMPTION",
    label: "Job Consumption",
  },
];

export default function MovementHistoryClient() {
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");

  const [error, setError] = useState("");

  // ---------------------------------------------------------
  // Load Movements
  // ---------------------------------------------------------

  async function loadMovements() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (type) {
        params.set("type", type);
      }

      const response = await fetch(
        `/api/inventory/movements?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to load stock movements."
        );
      }

      setMovements(result.data ?? []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load stock movements."
      );

      setMovements([]);
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // Initial Load
  // ---------------------------------------------------------

  useEffect(() => {
    loadMovements();
  }, []);

  // ---------------------------------------------------------
  // Search / Filter
  // ---------------------------------------------------------

  const filteredMovements = useMemo(() => {
    return movements;
  }, [movements]);

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------

  function getMovementLabel(
    movementType: MovementType
  ) {
    return (
      movementTypes.find(
        (item) => item.value === movementType
      )?.label ?? movementType
    );
  }

  function getMovementClass(
    movementType: MovementType
  ) {
    switch (movementType) {
      case "PURCHASE":
      case "SALE_RETURN":
      case "OPENING_STOCK":
        return "bg-emerald-50 text-emerald-700";

      case "SALE":
      case "PURCHASE_RETURN":
      case "DAMAGE":
      case "JOB_CONSUMPTION":
        return "bg-red-50 text-red-700";

      case "ADJUSTMENT":
        return "bg-blue-50 text-blue-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  function isStockIn(movementType: MovementType) {
    return (
      movementType === "PURCHASE" ||
      movementType === "SALE_RETURN" ||
      movementType === "OPENING_STOCK"
    );
  }

  function formatQuantity(
    quantity: number
  ) {
    return new Intl.NumberFormat("en-LK", {
      maximumFractionDigits: 3,
    }).format(quantity);
  }

  function formatDate(
    date: string
  ) {
    return new Intl.DateTimeFormat("en-LK", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }

  function clearFilters() {
    setSearch("");
    setType("");

    setTimeout(() => {
      loadMovements();
    }, 0);
  }

  // ---------------------------------------------------------
  // Summary
  // ---------------------------------------------------------

  const totalMovements =
    filteredMovements.length;

  const stockInMovements =
    filteredMovements.filter((item) =>
      isStockIn(item.type)
    ).length;

  const stockOutMovements =
    filteredMovements.filter(
      (item) => !isStockIn(item.type)
    ).length;

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900">
                <Boxes className="h-5 w-5 text-white" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Stock Movement History
                </h1>

                <p className="text-sm text-slate-500">
                  View all inventory stock movements
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadMovements}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-primary dark:text-primary-foreground px-4 text-sm font-medium text-white transition hover:bg-slate-800 dark:hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? "animate-spin" : ""
              }`}
            />

            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">
              Total Movements
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-foreground">
              {totalMovements}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">
                  Stock In
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stockInMovements}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                <ArrowDownLeft className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">
                  Stock Out
                </p>

                <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                  {stockOutMovements}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40">
                <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_auto]">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    loadMovements();
                  }
                }}
                placeholder="Search product, code, reference or note..."
                className="h-10 w-full rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 pl-10 pr-4 text-sm text-slate-900 dark:text-foreground outline-none transition focus:border-slate-400 focus:bg-white dark:focus:bg-card"
              />
            </div>

            {/* Type */}
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);

                setTimeout(() => {
                  loadMovements();
                }, 0);
              }}
              className="h-10 rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 px-3 text-sm text-slate-900 dark:text-foreground outline-none transition focus:border-slate-400 focus:bg-white dark:focus:bg-card"
            >
              <option value="">
                All Movement Types
              </option>

              {movementTypes.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </select>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadMovements}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-primary dark:text-primary-foreground px-4 text-sm font-medium text-white hover:bg-slate-800 dark:hover:bg-primary/90"
              >
                <Search className="h-4 w-4" />
                Search
              </button>

              {(search || type) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-muted/30 px-4 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full">
              <thead className="border-b border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                    Date / Time
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                    Product
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                    Type
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                    Quantity
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                    Reference
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                    Note
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-border/60">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-sm text-slate-500 dark:text-muted-foreground"
                    >
                      Loading stock movements...
                    </td>
                  </tr>
                ) : filteredMovements.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <Boxes className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />

                        <p className="text-sm font-medium text-slate-600 dark:text-muted-foreground">
                          No stock movements found
                        </p>

                        <p className="mt-1 text-xs text-slate-400 dark:text-muted-foreground">
                          Stock movement records will appear here.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map(
                    (movement) => (
                      <tr
                        key={movement.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-muted/30"
                      >
                        {/* Date */}
                        <td className="whitespace-nowrap px-4 py-4">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {formatDate(
                              movement.createdAt
                            )}
                          </p>
                        </td>

                        {/* Product */}
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-foreground">
                              {movement.product.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                              {movement.product.code}

                              {movement.product.barcode
                                ? ` • ${movement.product.barcode}`
                                : ""}
                            </p>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getMovementClass(
                              movement.type
                            )}`}
                          >
                            {getMovementLabel(
                              movement.type
                            )}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isStockIn(
                              movement.type
                            ) ? (
                              <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}

                            <span
                              className={`text-sm font-bold ${
                                isStockIn(
                                  movement.type
                                )
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {isStockIn(
                                movement.type
                              )
                                ? "+"
                                : "-"}
                              {formatQuantity(
                                movement.quantity
                              )}{" "}
                              {movement.product.unit}
                            </span>
                          </div>
                        </td>

                        {/* Reference */}
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {movement.referenceId ||
                              "-"}
                          </span>
                        </td>

                        {/* Note */}
                        <td className="max-w-xs px-4 py-4">
                          <p className="truncate text-sm text-slate-600 dark:text-muted-foreground">
                            {movement.note || "-"}
                          </p>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading &&
            filteredMovements.length > 0 && (
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">
                  Showing {filteredMovements.length} movement
                  {filteredMovements.length !== 1
                    ? "s"
                    : ""}
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}