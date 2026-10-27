"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Package,
  Plus,
  Search,
  TrendingDown,
  XCircle,
} from "lucide-react";

import StockAdjustmentModal from "./StockAdjustmentModal";

type InventoryItem = {
  id: number;
  productId: number;
  product: {
    id: number;
    code: string;
    barcode: string | null;
    name: string;
    category: string;
    brand: string;
    unit: string;
  };
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumStock: number;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  updatedAt: string;
};

type AdjustmentProduct = {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
};

export default function InventoryClient() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentProducts, setAdjustmentProducts] = useState<
    AdjustmentProduct[]
  >([]);

  async function loadInventory() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/inventory", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load inventory."
        );
      }

      setItems(result.data || []);
    } catch (error) {
      console.error("LOAD INVENTORY ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load inventory."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAdjustmentProducts() {
    try {
      const response = await fetch("/api/inventory", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load products."
        );
      }

      const products: AdjustmentProduct[] = (
        result.data || []
      ).map((item: InventoryItem) => ({
        id: item.product.id,
        code: item.product.code,
        name: item.product.name,
        quantity: item.quantity,
        unit: item.product.unit,
      }));

      setAdjustmentProducts(products);
    } catch (error) {
      console.error(
        "LOAD ADJUSTMENT PRODUCTS ERROR:",
        error
      );
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.product.name
          .toLowerCase()
          .includes(keyword) ||
        item.product.code
          .toLowerCase()
          .includes(keyword) ||
        (item.product.barcode || "")
          .toLowerCase()
          .includes(keyword) ||
        item.product.category
          .toLowerCase()
          .includes(keyword) ||
        item.product.brand
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [items, search]);

  const summary = useMemo(() => {
    return {
      total: items.length,

      inStock: items.filter(
        (item) => item.status === "IN_STOCK"
      ).length,

      lowStock: items.filter(
        (item) => item.status === "LOW_STOCK"
      ).length,

      outOfStock: items.filter(
        (item) => item.status === "OUT_OF_STOCK"
      ).length,
    };
  }, [items]);

  function formatQuantity(value: number) {
    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  function getStatusLabel(
    status: InventoryItem["status"]
  ) {
    switch (status) {
      case "IN_STOCK":
        return "In Stock";

      case "LOW_STOCK":
        return "Low Stock";

      case "OUT_OF_STOCK":
        return "Out of Stock";

      default:
        return status;
    }
  }

  function getStatusClass(
    status: InventoryItem["status"]
  ) {
    switch (status) {
      case "IN_STOCK":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";

      case "LOW_STOCK":
        return "bg-amber-50 text-amber-700 border-amber-200";

      case "OUT_OF_STOCK":
        return "bg-red-50 text-red-700 border-red-200";

      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  }

  async function handleOpenAdjustment() {
    await loadAdjustmentProducts();
    setAdjustmentOpen(true);
  }

  async function handleAdjustmentSuccess() {
    await loadInventory();
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900">
              <Boxes className="h-5 w-5 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Inventory
              </h1>

              <p className="text-sm text-slate-500">
                Monitor product stock and availability
              </p>
            </div>
          </div>
        </div>

        {/* Header Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAdjustment}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Stock Adjustment
          </button>

          <button
            type="button"
            onClick={loadInventory}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Refresh Stock
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Products
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {summary.total}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
              <Package className="h-5 w-5 text-slate-700" />
            </div>
          </div>
        </div>

        {/* In Stock */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                In Stock
              </p>

              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {summary.inStock}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <Boxes className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Low Stock */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Low Stock
              </p>

              <p className="mt-2 text-2xl font-bold text-amber-600">
                {summary.lowStock}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
              <TrendingDown className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Out of Stock
              </p>

              <p className="mt-2 text-2xl font-bold text-red-600">
                {summary.outOfStock}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Search */}
        <div className="border-b border-slate-200 p-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search product, code, barcode, category..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="m-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

            <div>
              <p className="font-semibold">
                Unable to load inventory
              </p>

              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

              <p className="mt-3 text-sm text-slate-500">
                Loading inventory...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Product
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Category
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Unit
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Stock
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Reserved
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Available
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Minimum
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Updated
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-16 text-center"
                      >
                        <Boxes className="mx-auto h-10 w-10 text-slate-300" />

                        <p className="mt-3 text-sm font-medium text-slate-600">
                          No inventory records found
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {search
                            ? "Try a different search term."
                            : "There are no stock records available yet."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50"
                      >
                        {/* Product */}
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-slate-900">
                              {item.product.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Code: {item.product.code}
                            </p>

                            {item.product.barcode && (
                              <p className="text-xs text-slate-400">
                                Barcode: {item.product.barcode}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {item.product.category || "-"}
                        </td>

                        {/* Unit */}
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {item.product.unit || "-"}
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                          {formatQuantity(item.quantity)}
                        </td>

                        {/* Reserved */}
                        <td className="px-4 py-4 text-right text-sm text-slate-600">
                          {formatQuantity(
                            item.reservedQuantity
                          )}
                        </td>

                        {/* Available */}
                        <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                          {formatQuantity(
                            item.availableQuantity
                          )}
                        </td>

                        {/* Minimum */}
                        <td className="px-4 py-4 text-right text-sm text-slate-600">
                          {formatQuantity(
                            item.minimumStock
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                              item.status
                            )}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </td>

                        {/* Updated */}
                        <td className="px-4 py-4 text-right text-sm text-slate-500">
                          {formatDate(item.updatedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {filteredItems.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {items.length}
                </span>{" "}
                inventory records
              </p>
            </div>
          </>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        open={adjustmentOpen}
        products={adjustmentProducts}
        onClose={() => setAdjustmentOpen(false)}
        onSuccess={handleAdjustmentSuccess}
      />
    </div>
  );
}