"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  X,
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
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setProductId("");
      setType("IN");
      setQuantity("");
      setReason("");
      setNote("");
      setError("");
      setSaving(false);
    }
  }, [open]);

  const selectedProduct = useMemo(() => {
    return products.find(
      (product) => product.id === Number(productId)
    );
  }, [products, productId]);

  const currentStock = selectedProduct?.quantity ?? 0;
  const adjustmentQuantity = Number(quantity) || 0;

  const resultingStock =
    type === "IN"
      ? currentStock + adjustmentQuantity
      : currentStock - adjustmentQuantity;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!productId) {
      setError("Please select a product.");
      return;
    }

    if (!Number.isFinite(adjustmentQuantity) || adjustmentQuantity <= 0) {
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
          {/* Product */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Product
            </label>

            <select
              value={productId}
              onChange={(event) =>
                setProductId(event.target.value)
              }
              disabled={saving}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="">
                Select product
              </option>

              {products.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.code} - {product.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Product Stock */}
          {selectedProduct && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Package className="h-5 w-5 text-slate-600" />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedProduct.name}
                  </p>

                  <p className="text-xs text-slate-500">
                    {selectedProduct.code}
                  </p>
                </div>

                <div className="text-right">
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