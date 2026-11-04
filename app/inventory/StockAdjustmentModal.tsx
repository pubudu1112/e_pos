
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

  // Product search wrapper reference
  const productSearchRef = useRef<HTMLDivElement>(null);

  // Reset form when modal closes
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

  // Close dropdown when clicking outside product search
  // Clear unfinished search automatically
  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event: PointerEvent) {
      const target = event.target as Node;

      if (
        productSearchRef.current &&
        !productSearchRef.current.contains(target)
      ) {
        setProductDropdownOpen(false);

        // Clear search only when no product is selected
        if (!productId) {
          setProductSearch("");
        }
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [open, productId]);

  // Selected product
  const selectedProduct = useMemo(() => {
    return products.find(
      (product) => product.id === Number(productId)
    );
  }, [products, productId]);

  // Filter products by name or code
  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    if (!search) return products;

    return products.filter((product) =>
      `${product.name} ${product.code}`
        .toLowerCase()
        .includes(search)
    );
  }, [products, productSearch]);

  // Stock calculations
  const currentStock = selectedProduct?.quantity ?? 0;
  const adjustmentQuantity = Number(quantity) || 0;

  const resultingStock =
    type === "IN"
      ? currentStock + adjustmentQuantity
      : currentStock - adjustmentQuantity;

  // Select product
  function handleSelectProduct(product: Product) {
    setProductId(String(product.id));

    // Display product name as the main search value
    setProductSearch(product.name);

    setProductDropdownOpen(false);
    setError("");
  }

  // Clear selected product
  function handleClearProduct() {
    setProductId("");
    setProductSearch("");
    setProductDropdownOpen(true);
    setError("");
  }

  // Handle search input
  function handleProductSearch(value: string) {
    setProductSearch(value);
    setProductId("");
    setProductDropdownOpen(true);
    setError("");
  }

  // Submit stock adjustment
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
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

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >

          {/* Product Search */}
          <div
            ref={productSearchRef}
            className="relative"
          >

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Product
            </label>

            {/* Search Input */}
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
                placeholder="Search product name or code..."
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

            {/* Search Results Dropdown */}
            {productDropdownOpen && !saving && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">

                {filteredProducts.length > 0 ? (

                  filteredProducts.map((product) => (

                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectProduct(product)}
                      className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-0 hover:bg-blue-50 ${
                        productId === String(product.id)
                          ? "bg-blue-50"
                          : "bg-white"
                      }`}
                    >

                      {/* Product Name - Primary */}
                      <div className="min-w-0 flex-1">

                        <p className="truncate text-sm font-semibold text-slate-900">
                          {product.name}
                        </p>

                        {/* Product Code - Secondary */}
                        <p className="mt-1 text-xs text-slate-400">
                          Code: {product.code}
                        </p>

                      </div>

                      {/* Current Stock */}
                      <div className="shrink-0 text-right">

                        <p className="text-xs text-slate-400">
                          Stock
                        </p>

                        <p className="text-sm font-semibold text-slate-700">
                          {product.quantity.toLocaleString("en-US", {
                            maximumFractionDigits: 3,
                          })}{" "}
                          {product.unit}
                        </p>

                      </div>

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
                      Try another product name or code.
                    </p>

                  </div>

                )}

              </div>
            )}

            {/* Selected Product Indicator */}
            {selectedProduct && (
              <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                <Check className="h-3.5 w-3.5" />
                Product selected successfully
              </p>
            )}

          </div>

          {/* Selected Product Stock */}
          {selectedProduct && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Package className="h-5 w-5 text-slate-600" />
                </div>

                <div className="min-w-0 flex-1">

                  <p className="truncate text-sm font-semibold text-slate-900">
                    {selectedProduct.name}
                  </p>

                  <p className="text-xs text-slate-500">
                    Code: {selectedProduct.code}
                  </p>

                </div>

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

          {/* Adjustment Type */}
          <div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Adjustment Type
            </label>

            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() => setType("IN")}
                disabled={saving}
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                  type === "IN"
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
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                  type === "OUT"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <ArrowUpFromLine className="h-4 w-4" />
                Stock Out
              </button>

            </div>

          </div>

          {/* Quantity */}
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

          {/* Resulting Stock */}
          {selectedProduct && adjustmentQuantity > 0 && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                resultingStock < 0
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

          {/* Reason */}
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

          {/* Note */}
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

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Buttons */}
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
              className={`h-10 rounded-lg px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                type === "IN"
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
