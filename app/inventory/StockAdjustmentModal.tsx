
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  X,
  Search,
  Check,
} from "lucide-react";

type Product = {
  id: number;
  code: string;
  name: string;
  brand?: string | null;
  quantity: number;
  unit: string;
};

type StockAdjustmentModalProps = {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onSuccess: () => void;
};

export default function StockAdjustmentModal({
  open,
  products,
  onClose,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [productId, setProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const productSearchRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // RESET FORM
  // ============================================================

  useEffect(() => {
    if (!open) {
      setProductId("");
      setProductSearch("");
      setProductDropdownOpen(false);

      setType("IN");
      setQuantity("");
      setReason("");
      setNote("");

      setError("");
      setSaving(false);
    }
  }, [open]);

  // ============================================================
  // OUTSIDE CLICK
  // ============================================================

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event: PointerEvent) {
      const target = event.target as Node;

      if (
        productSearchRef.current &&
        !productSearchRef.current.contains(target)
      ) {
        setProductDropdownOpen(false);

        // Clear unfinished search when clicking outside.
        // Keep selected product name visible.
        if (!productId) {
          setProductSearch("");
        }
      }
    }

    document.addEventListener(
      "pointerdown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick
      );
    };
  }, [open, productId]);

  // ============================================================
  // SELECTED PRODUCT
  // ============================================================

  const selectedProduct = useMemo(() => {
    return products.find(
      (product) => product.id === Number(productId)
    );
  }, [products, productId]);

  // ============================================================
  // FILTER PRODUCTS
  // Search by name, brand or code
  // ============================================================

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    if (!search) return products;

    return products.filter((product) => {
      const searchableText = [
        product.name,
        product.brand || "",
        product.code,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [products, productSearch]);

  // ============================================================
  // STOCK CALCULATIONS
  // ============================================================

  const currentStock = selectedProduct?.quantity ?? 0;

  const adjustmentQuantity = Number(quantity) || 0;

  const resultingStock =
    type === "IN"
      ? currentStock + adjustmentQuantity
      : currentStock - adjustmentQuantity;

  // ============================================================
  // SELECT PRODUCT
  // ============================================================

  function handleSelectProduct(product: Product) {
    setProductId(String(product.id));

    // Keep only product name in search field
    setProductSearch(product.name);

    setProductDropdownOpen(false);
    setError("");
  }

  // ============================================================
  // CLEAR PRODUCT
  // ============================================================

  function handleClearProduct() {
    setProductId("");
    setProductSearch("");
    setProductDropdownOpen(true);
    setError("");
  }

  // ============================================================
  // SEARCH INPUT
  // ============================================================

  function handleProductSearch(value: string) {
    setProductSearch(value);

    // Clear previous selection when searching another product
    setProductId("");

    setProductDropdownOpen(true);
    setError("");
  }

  // ============================================================
  // SUBMIT STOCK ADJUSTMENT
  // ============================================================

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!productId || !selectedProduct) {
      setError("Please select a product.");
      return;
    }

    if (
      !Number.isFinite(adjustmentQuantity) ||
      adjustmentQuantity <= 0
    ) {
      setError("Quantity must be greater than 0.");
      return;
    }

    if (
      type === "OUT" &&
      adjustmentQuantity > currentStock
    ) {
      setError(
        `Insufficient stock. Current stock is ${currentStock}.`
      );
      return;
    }

    if (reason.trim().length > 255) {
      setError("Reason cannot exceed 255 characters.");
      return;
    }

    if (note.trim().length > 255) {
      setError("Note cannot exceed 255 characters.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/inventory/adjustment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: Number(productId),
            type,
            quantity: adjustmentQuantity,
            reason: reason.trim(),
            note: note.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
          "Unable to create stock adjustment."
        );
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(
        "CREATE STOCK ADJUSTMENT ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to create stock adjustment."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Stock Adjustment
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Increase or decrease product stock
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >

          {/* ================================================ */}
          {/* PRODUCT SEARCH */}
          {/* ================================================ */}

          <div
            ref={productSearchRef}
            className="relative"
          >

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Product
            </label>

            {/* SEARCH INPUT */}
            <div className="relative">

              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={productSearch}
                onChange={(event) =>
                  handleProductSearch(event.target.value)
                }
                onFocus={() => {
                  setProductDropdownOpen(true);
                }}
                disabled={saving}
                placeholder="Search product name, brand or code..."
                autoComplete="off"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              {productSearch && (
                <button
                  type="button"
                  onClick={handleClearProduct}
                  disabled={saving}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

            </div>

            {/* ============================================ */}
            {/* PRODUCT SEARCH RESULTS */}
            {/* ============================================ */}

            {productDropdownOpen && !saving && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">

                {filteredProducts.length > 0 ? (

                  filteredProducts.map((product) => (

                    <button
                      key={product.id}
                      type="button"
                      onClick={() =>
                        handleSelectProduct(product)
                      }
                      className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-0 hover:bg-blue-50 ${productId === String(product.id)
                          ? "bg-blue-50"
                          : "bg-white"
                        }`}
                    >

                      {/* PRODUCT INFORMATION */}
                      <div className="min-w-0 flex-1">

                        {/* Product Name */}
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {product.name}
                        </p>

                        {/* Brand */}
                        {product.brand && (
                          <p className="mt-1 truncate text-xs font-medium text-blue-600">
                            Brand: {product.brand}
                          </p>
                        )}

                        {/* Product Code */}
                        <p className="mt-1 text-xs text-slate-400">
                          Code: {product.code}
                        </p>

                      </div>

                      {/* CURRENT STOCK */}
                      <div className="shrink-0 text-right">

                        <p className="text-xs text-slate-400">
                          Stock
                        </p>

                        <p className="text-sm font-semibold text-slate-700">
                          {product.quantity.toLocaleString(
                            "en-US",
                            {
                              maximumFractionDigits: 3,
                            }
                          )}{" "}
                          {product.unit}
                        </p>

                      </div>

                      {/* SELECTED INDICATOR */}
                      {productId === String(product.id) && (
                        <Check className="h-4 w-4 shrink-0 text-blue-600" />
                      )}

                    </button>

                  ))

                ) : (

                  <div className="px-4 py-6 text-center">

                    <Package className="mx-auto mb-2 h-6 w-6 text-slate-300" />

                    <p className="text-sm font-medium text-slate-600">
                      No products found
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Try another product name, brand or code.
                    </p>

                  </div>

                )}

              </div>
            )}

            {/* SELECTED PRODUCT INDICATOR */}
            {selectedProduct && (
              <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                <Check className="h-3.5 w-3.5" />
                Product selected successfully
              </p>
            )}

          </div>

          {/* ================================================ */}
          {/* SELECTED PRODUCT INFORMATION */}
          {/* ================================================ */}

          {selectedProduct && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Package className="h-5 w-5 text-slate-600" />
                </div>

                {/* PRODUCT DETAILS */}
                <div className="min-w-0 flex-1">

                  <p className="truncate text-sm font-semibold text-slate-900">
                    {selectedProduct.name}
                  </p>

                  {selectedProduct.brand && (
                    <p className="mt-1 truncate text-xs font-medium text-blue-600">
                      Brand: {selectedProduct.brand}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-slate-500">
                    Code: {selectedProduct.code}
                  </p>

                </div>

                {/* CURRENT STOCK */}
                <div className="shrink-0 text-right">

                  <p className="text-xs text-slate-500">
                    Current Stock
                  </p>

                  <p className="text-lg font-bold text-slate-900">
                    {currentStock.toLocaleString("en-US", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    {selectedProduct.unit}
                  </p>

                </div>

              </div>

            </div>
          )}

          {/* ================================================ */}
          {/* ADJUSTMENT TYPE */}
          {/* ================================================ */}

          <div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Adjustment Type
            </label>

            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() => setType("IN")}
                disabled={saving}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition ${type === "IN"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
              >
                <ArrowDownToLine className="h-4 w-4" />
                Stock In
              </button>

              <button
                type="button"
                onClick={() => setType("OUT")}
                disabled={saving}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition ${type === "OUT"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
              >
                <ArrowUpFromLine className="h-4 w-4" />
                Stock Out
              </button>

            </div>

          </div>

          {/* ================================================ */}
          {/* QUANTITY */}
          {/* ================================================ */}

          <div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Quantity
            </label>

            <input
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(event) =>
                setQuantity(event.target.value)
              }
              disabled={saving}
              placeholder="0.000"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />

          </div>

          {/* ================================================ */}
          {/* RESULTING STOCK */}
          {/* ================================================ */}

          {selectedProduct && adjustmentQuantity > 0 && (
            <div
              className={`rounded-lg border p-3 text-sm ${resultingStock < 0
                  ? "border-red-200 bg-red-50 text-red-700"
                  : type === "IN"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
            >

              <div className="flex items-center justify-between">

                <span className="font-medium">
                  New Stock
                </span>

                <span className="font-bold">
                  {resultingStock.toLocaleString("en-US", {
                    maximumFractionDigits: 3,
                  })}{" "}
                  {selectedProduct.unit}
                </span>

              </div>

            </div>
          )}

          {/* ================================================ */}
          {/* REASON */}
          {/* ================================================ */}

          <div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Reason
            </label>

            <input
              type="text"
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              disabled={saving}
              maxLength={255}
              placeholder="e.g. Opening stock, damaged item..."
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />

          </div>

          {/* ================================================ */}
          {/* NOTE */}
          {/* ================================================ */}

          <div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Note
            </label>

            <textarea
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              disabled={saving}
              maxLength={255}
              rows={3}
              placeholder="Additional note..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />

          </div>

          {/* ================================================ */}
          {/* ERROR */}
          {/* ================================================ */}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ================================================ */}
          {/* FOOTER BUTTONS */}
          {/* ================================================ */}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className={`h-10 rounded-lg px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${type === "IN"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
                }`}
            >
              {saving
                ? "Saving..."
                : type === "IN"
                  ? "Add Stock"
                  : "Remove Stock"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}
