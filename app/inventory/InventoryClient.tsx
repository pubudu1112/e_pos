
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import StockAdjustmentModal from "./StockAdjustmentModal";

// ============================================================
// TYPES
// ============================================================

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
  brand: string | null;
  quantity: number;
  unit: string;
};

type SortColumn =
  | "name"
  | "category"
  | "unit"
  | "quantity"
  | "reservedQuantity"
  | "availableQuantity"
  | "minimumStock"
  | "status"
  | "updatedAt";

type SortDirection = "asc" | "desc";

// ============================================================
// COMPONENT
// ============================================================

export default function InventoryClient() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting
  const [sortColumn, setSortColumn] =
    useState<SortColumn>("name");

  const [sortDirection, setSortDirection] =
    useState<SortDirection>("asc");

  // Stock Adjustment
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);

  const [adjustmentProducts, setAdjustmentProducts] = useState<
    AdjustmentProduct[]
  >([]);

  // ============================================================
  // LOAD INVENTORY
  // ============================================================

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

  // ============================================================
  // LOAD ADJUSTMENT PRODUCTS
  // ============================================================

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
        brand: item.product.brand || null,
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

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadInventory();
  }, []);

  // ============================================================
  // SEARCH INVENTORY
  // ============================================================

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.product.name.toLowerCase().includes(keyword) ||
        item.product.code.toLowerCase().includes(keyword) ||
        (item.product.barcode || "")
          .toLowerCase()
          .includes(keyword) ||
        item.product.category.toLowerCase().includes(keyword) ||
        item.product.brand.toLowerCase().includes(keyword)
      );
    });
  }, [items, search]);

  // ============================================================
  // SUMMARY CARDS
  // ============================================================

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

  // ============================================================
  // STATUS LABEL
  // ============================================================

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

  // ============================================================
  // STATUS CLASS
  // ============================================================

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

  // ============================================================
  // SORTING
  // ============================================================

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((previous) =>
        previous === "asc" ? "desc" : "asc"
      );
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }

    // Return to first page after sorting
    setCurrentPage(1);
  }

  // Sort all filtered records before pagination
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case "name":
          comparison = a.product.name.localeCompare(
            b.product.name,
            undefined,
            { sensitivity: "base" }
          );
          break;

        case "category":
          comparison = (
            a.product.category || ""
          ).localeCompare(
            b.product.category || "",
            undefined,
            { sensitivity: "base" }
          );
          break;

        case "unit":
          comparison = (
            a.product.unit || ""
          ).localeCompare(
            b.product.unit || "",
            undefined,
            { sensitivity: "base" }
          );
          break;

        case "quantity":
          comparison = a.quantity - b.quantity;
          break;

        case "reservedQuantity":
          comparison =
            a.reservedQuantity - b.reservedQuantity;
          break;

        case "availableQuantity":
          comparison =
            a.availableQuantity - b.availableQuantity;
          break;

        case "minimumStock":
          comparison =
            a.minimumStock - b.minimumStock;
          break;

        case "status":
          comparison = getStatusLabel(a.status).localeCompare(
            getStatusLabel(b.status)
          );
          break;

        case "updatedAt":
          comparison =
            new Date(a.updatedAt).getTime() -
            new Date(b.updatedAt).getTime();
          break;
      }

      return sortDirection === "asc"
        ? comparison
        : -comparison;
    });
  }, [filteredItems, sortColumn, sortDirection]);

  // Sorting icon
  function getSortIcon(column: SortColumn) {
    if (sortColumn !== column) {
      return (
        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
      );
    }

    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
    );
  }

  // ============================================================
  // PAGINATION
  // ============================================================

  const totalRecords = sortedItems.length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalRecords / pageSize)
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const startIndex =
    (safeCurrentPage - 1) * pageSize;

  const endIndex = Math.min(
    startIndex + pageSize,
    totalRecords
  );

  // Records for current page
  const paginatedItems = useMemo(() => {
    return sortedItems.slice(
      startIndex,
      startIndex + pageSize
    );
  }, [sortedItems, startIndex, pageSize]);

  // Reset page when searching
  function handleSearch(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  // Change page size
  function handlePageSizeChange(value: number) {
    setPageSize(value);
    setCurrentPage(1);
  }

  // Change page
  function handlePageChange(page: number) {
    if (page < 1 || page > totalPages) {
      return;
    }

    setCurrentPage(page);
  }

  // Keep current page valid after data changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Generate maximum 5 visible page numbers
  const pageNumbers = useMemo(() => {
    const maxVisiblePages = 5;

    let startPage = Math.max(
      1,
      safeCurrentPage - Math.floor(maxVisiblePages / 2)
    );

    const endPage = Math.min(
      totalPages,
      startPage + maxVisiblePages - 1
    );

    startPage = Math.max(
      1,
      endPage - maxVisiblePages + 1
    );

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, index) => startPage + index
    );
  }, [safeCurrentPage, totalPages]);

  // ============================================================
  // FORMAT FUNCTIONS
  // ============================================================

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

  // ============================================================
  // STOCK ADJUSTMENT
  // ============================================================

  async function handleOpenAdjustment() {
    await loadAdjustmentProducts();
    setAdjustmentOpen(true);
  }

  async function handleAdjustmentSuccess() {
    await loadInventory();
  }

  // ============================================================
  // TABLE SORT HEADER
  // ============================================================

  function SortHeader({
    column,
    children,
    align = "left",
  }: {
    column: SortColumn;
    children: React.ReactNode;
    align?: "left" | "right" | "center";
  }) {
    return (
      <th
        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${align === "right"
            ? "text-right"
            : align === "center"
              ? "text-center"
              : "text-left"
          }`}
      >
        <button
          type="button"
          onClick={() => handleSort(column)}
          className={`inline-flex items-center gap-2 whitespace-nowrap transition hover:text-slate-900 ${align === "right"
              ? "ml-auto"
              : align === "center"
                ? "mx-auto"
                : ""
            }`}
          aria-label={`Sort by ${column}`}
        >
          {children}
          {getSortIcon(column)}
        </button>
      </th>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-4 sm:p-6">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-primary dark:text-primary-foreground px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Stock Adjustment
          </button>

          <button
            type="button"
            onClick={loadInventory}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-4 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh Stock
          </button>

        </div>
      </div>

      {/* ====================================================== */}
      {/* SUMMARY CARDS */}
      {/* ====================================================== */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* Total */}
        <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">
                Total Products
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-foreground">
                {summary.total}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-muted">
              <Package className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </div>

          </div>
        </div>

        {/* In Stock */}
        <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">
                In Stock
              </p>

              <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {summary.inStock}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
              <Boxes className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>

          </div>
        </div>

        {/* Low Stock */}
        <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">
                Low Stock
              </p>

              <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {summary.lowStock}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40">
              <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>

          </div>
        </div>

        {/* Out of Stock */}
        <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-muted-foreground">
                Out of Stock
              </p>

              <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                {summary.outOfStock}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/40">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>

          </div>
        </div>

      </div>

      {/* ====================================================== */}
      {/* MAIN INVENTORY CARD */}
      {/* ====================================================== */}

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm">

        {/* Search */}
        <div className="border-b border-slate-200 dark:border-border p-4">

          <div className="relative max-w-xl">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                handleSearch(event.target.value)
              }
              placeholder="Search product, code, barcode, category..."
              className="h-10 w-full rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted/40 pl-10 pr-4 text-sm text-slate-900 dark:text-foreground outline-none transition placeholder:text-slate-400 dark:placeholder:text-muted-foreground focus:border-slate-400 focus:bg-white dark:focus:bg-card"
            />

          </div>

          {/* Search Result Information */}
          {search.trim() && (
            <p className="mt-2 text-xs text-slate-500 dark:text-muted-foreground">
              Found{" "}
              <span className="font-semibold text-slate-700 dark:text-foreground">
                {totalRecords}
              </span>{" "}
              matching inventory records
            </p>
          )}

        </div>

        {/* Error */}
        {error && (
          <div className="m-4 flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-400">

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

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-border border-t-slate-900 dark:border-t-primary" />

              <p className="mt-3 text-sm text-slate-500 dark:text-muted-foreground">
                Loading inventory...
              </p>

            </div>

          </div>

        ) : (

          <>

            {/* ================================================== */}
            {/* INVENTORY TABLE */}
            {/* ================================================== */}

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1100px] text-left">

                <thead className="bg-slate-50 dark:bg-muted/40">

                  <tr className="border-b border-slate-200 dark:border-border">

                    <SortHeader column="name">
                      Product
                    </SortHeader>

                    <SortHeader column="category">
                      Category
                    </SortHeader>

                    <SortHeader column="unit">
                      Unit
                    </SortHeader>

                    <SortHeader
                      column="quantity"
                      align="right"
                    >
                      Stock
                    </SortHeader>

                    <SortHeader
                      column="reservedQuantity"
                      align="right"
                    >
                      Reserved
                    </SortHeader>

                    <SortHeader
                      column="availableQuantity"
                      align="right"
                    >
                      Available
                    </SortHeader>

                    <SortHeader
                      column="minimumStock"
                      align="right"
                    >
                      Minimum
                    </SortHeader>

                    <SortHeader
                      column="status"
                      align="center"
                    >
                      Status
                    </SortHeader>

                    <SortHeader
                      column="updatedAt"
                      align="right"
                    >
                      Updated
                    </SortHeader>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-border/60">

                  {paginatedItems.length === 0 ? (

                    <tr>

                      <td
                        colSpan={9}
                        className="px-4 py-16 text-center"
                      >

                        <Boxes className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />

                        <p className="mt-3 text-sm font-medium text-slate-600 dark:text-muted-foreground">
                          No inventory records found
                        </p>

                        <p className="mt-1 text-xs text-slate-400 dark:text-muted-foreground">
                          {search
                            ? "Try a different search term."
                            : "There are no stock records available yet."}
                        </p>

                      </td>

                    </tr>

                  ) : (

                    paginatedItems.map((item) => (

                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-muted/30"
                      >

                        {/* Product */}
                        <td className="px-4 py-4">

                          <div>

                            <p className="font-medium text-slate-900 dark:text-foreground">
                              {item.product.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                              Code: {item.product.code}
                            </p>

                            {item.product.barcode && (
                              <p className="text-xs text-slate-400 dark:text-muted-foreground">
                                Barcode: {item.product.barcode}
                              </p>
                            )}

                          </div>

                        </td>

                        {/* Category */}
                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {item.product.category || "-"}
                        </td>

                        {/* Unit */}
                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {item.product.unit || "-"}
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900 dark:text-foreground">
                          {formatQuantity(item.quantity)}
                        </td>

                        {/* Reserved */}
                        <td className="px-4 py-4 text-right text-sm text-slate-600 dark:text-slate-300">
                          {formatQuantity(item.reservedQuantity)}
                        </td>

                        {/* Available */}
                        <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900 dark:text-foreground">
                          {formatQuantity(item.availableQuantity)}
                        </td>

                        {/* Minimum */}
                        <td className="px-4 py-4 text-right text-sm text-slate-600 dark:text-slate-300">
                          {formatQuantity(item.minimumStock)}
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
                        <td className="px-4 py-4 text-right text-sm text-slate-500 dark:text-muted-foreground">
                          {formatDate(item.updatedAt)}
                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>

            {/* ================================================== */}
            {/* PAGINATION FOOTER */}
            {/* ================================================== */}

            <div className="flex flex-col gap-4 border-t border-slate-200 dark:border-border bg-white dark:bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">

              {/* Record Information */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

                <p className="text-xs text-slate-500 dark:text-muted-foreground">

                  Showing{" "}

                  <span className="font-semibold text-slate-800 dark:text-foreground">
                    {totalRecords === 0 ? 0 : startIndex + 1}
                  </span>

                  {" - "}

                  <span className="font-semibold text-slate-800 dark:text-foreground">
                    {endIndex}
                  </span>

                  {" of "}

                  <span className="font-semibold text-slate-800 dark:text-foreground">
                    {totalRecords}
                  </span>

                  {" records"}

                </p>

                {/* Rows Per Page */}
                <div className="flex items-center gap-2">

                  <label
                    htmlFor="inventory-page-size"
                    className="whitespace-nowrap text-xs text-slate-500 dark:text-muted-foreground"
                  >
                    Rows per page:
                  </label>

                  <select
                    id="inventory-page-size"
                    value={pageSize}
                    onChange={(event) =>
                      handlePageSizeChange(
                        Number(event.target.value)
                      )
                    }
                    className="h-8 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-2 text-xs font-medium text-slate-700 dark:text-foreground outline-none focus:border-slate-400"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>

                </div>

              </div>

              {/* Pagination Controls */}
              <div className="flex flex-wrap items-center justify-center gap-1">

                {/* First Page */}
                <button
                  type="button"
                  onClick={() => handlePageChange(1)}
                  disabled={
                    safeCurrentPage === 1 ||
                    totalRecords === 0
                  }
                  title="First page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-muted/40 text-slate-600 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>

                {/* Previous */}
                <button
                  type="button"
                  onClick={() =>
                    handlePageChange(safeCurrentPage - 1)
                  }
                  disabled={
                    safeCurrentPage === 1 ||
                    totalRecords === 0
                  }
                  title="Previous page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-muted/40 text-slate-600 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* First Page Shortcut */}
                {pageNumbers.length > 0 &&
                  pageNumbers[0] > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePageChange(1)}
                        className="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-muted"
                      >
                        1
                      </button>

                      {pageNumbers[0] > 2 && (
                        <span className="px-1 text-xs text-slate-400 dark:text-muted-foreground">
                          ...
                        </span>
                      )}
                    </>
                  )}

                {/* Page Numbers */}
                {pageNumbers.map((page) => (

                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
                    aria-current={
                      safeCurrentPage === page
                        ? "page"
                        : undefined
                    }
                    className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${safeCurrentPage === page
                        ? "bg-slate-900 dark:bg-primary text-white dark:text-primary-foreground shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-muted"
                      }`}
                  >
                    {page}
                  </button>

                ))}

                {/* Last Page Shortcut */}
                {pageNumbers.length > 0 &&
                  pageNumbers[pageNumbers.length - 1] <
                  totalPages && (
                    <>
                      {pageNumbers[
                        pageNumbers.length - 1
                      ] < totalPages - 1 && (
                          <span className="px-1 text-xs text-slate-400 dark:text-muted-foreground">
                            ...
                          </span>
                        )}

                      <button
                        type="button"
                        onClick={() =>
                          handlePageChange(totalPages)
                        }
                        className="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-muted"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}

                {/* Next */}
                <button
                  type="button"
                  onClick={() =>
                    handlePageChange(safeCurrentPage + 1)
                  }
                  disabled={
                    safeCurrentPage === totalPages ||
                    totalRecords === 0
                  }
                  title="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-muted/40 text-slate-600 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Last Page */}
                <button
                  type="button"
                  onClick={() =>
                    handlePageChange(totalPages)
                  }
                  disabled={
                    safeCurrentPage === totalPages ||
                    totalRecords === 0
                  }
                  title="Last page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-muted/40 text-slate-600 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>

              </div>

            </div>

          </>

        )}

      </div>

      {/* ====================================================== */}
      {/* STOCK ADJUSTMENT MODAL */}
      {/* ====================================================== */}

      <StockAdjustmentModal
        open={adjustmentOpen}
        products={adjustmentProducts}
        onClose={() => setAdjustmentOpen(false)}
        onSuccess={handleAdjustmentSuccess}
      />

    </div>
  );
}
