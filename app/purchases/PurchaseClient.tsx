"use client";

import { useEffect, useMemo, useState } from "react";
import {
    CalendarDays,
    PackagePlus,
    Plus,
    Search,
    Trash2,
    ShoppingCart,
    Eye,
    X,
} from "lucide-react";

import { toast } from "sonner";

type Supplier = {
    id: number;
    code: string;
    name: string;
};

type Product = {
    id: number;
    code: string;
    name: string;
    sellingPrice: number;
    purchasePrice: number;
    stock: number;
};

type PurchaseItem = {
    productId: number;
    code: string;
    name: string;
    quantity: number;
    unitPrice: number;
    discount: number;
};

type PurchaseRecord = {
    id: number;
    purchaseNo: string;
    supplierId: number;
    purchaseDate: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    supplier: {
        id: number;
        code: string;
        name: string;
    };
    purchaseitem: Array<{
        id: number;
        productId: number;
        quantity: number;
        unitPrice: number;
        discount: number;
        total: number;
        product: {
            id: number;
            code: string;
            name: string;
        };
    }>;
    purchasepayment: Array<{
        id: number;
        amount: number;
        paymentDate: string;
        reference: string | null;
        note: string | null;
        paymentmethod: {
            id: number;
            name: string;
            type: string;
        };
    }>;
};

export default function PurchaseClient() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const [supplierId, setSupplierId] = useState<number | "">("");
    const [purchaseDate, setPurchaseDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    const [search, setSearch] = useState("");
    const [selectedProductId, setSelectedProductId] = useState<number | "">("");

    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);
    const [itemDiscount, setItemDiscount] = useState(0);

    const [items, setItems] = useState<PurchaseItem[]>([]);

    const [discount, setDiscount] = useState(0);
    const [tax, setTax] = useState(0);
    const [paidAmount, setPaidAmount] = useState(0);

    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [paymentReference, setPaymentReference] = useState("");
    const [paymentNote, setPaymentNote] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
    const [purchaseLoading, setPurchaseLoading] = useState(true);
    const [purchaseSearch, setPurchaseSearch] = useState("");
    const [selectedPurchase, setSelectedPurchase] =
        useState<PurchaseRecord | null>(null);

    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmountInput, setPaymentAmountInput] = useState("");
    const [additionalPaymentMethod, setAdditionalPaymentMethod] = useState("CASH");
    const [additionalPaymentReference, setAdditionalPaymentReference] = useState("");
    const [additionalPaymentNote, setAdditionalPaymentNote] = useState("");
    const [paymentSaving, setPaymentSaving] = useState(false);

    useEffect(() => {
        loadSuppliers();
        loadProducts();
        loadPurchases();
    }, []);

    async function loadSuppliers() {
        try {
            const response = await fetch("/api/suppliers");

            if (!response.ok) {
                throw new Error("Unable to load suppliers.");
            }

            const result = await response.json();

            setSuppliers(result.data ?? []);
        } catch (error) {
            console.error(error);

            toast.error("Failed to load suppliers.");
        }
    }

    async function loadProducts() {
        try {
            const response = await fetch("/api/pos/items");

            if (!response.ok) {
                throw new Error("Unable to load products.");
            }

            const result = await response.json();

            const productItems = (result.data ?? [])
                .filter((item: any) => item.type === "PRODUCT")
                .map((item: any) => ({
                    id: item.id,
                    code: item.code,
                    name: item.name,
                    sellingPrice: Number(item.price ?? 0),
                    purchasePrice: Number(item.purchasePrice ?? 0),
                    stock: Number(item.stock ?? 0),
                }));

            setProducts(productItems);
        } catch (error) {
            console.error(error);

            toast.error("Failed to load products.");
        } finally {
            setLoading(false);
        }
    }

    async function loadPurchases() {
        try {
            setPurchaseLoading(true);

            const response = await fetch("/api/purchases", {
                cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Unable to load purchases."
                );
            }

            const data = (result.data ?? []).map((purchase: any) => ({
                ...purchase,
                subtotal: Number(purchase.subtotal),
                discount: Number(purchase.discount),
                tax: Number(purchase.tax),
                total: Number(purchase.total),
                paidAmount: Number(purchase.paidAmount),
                balanceAmount: Number(purchase.balanceAmount),
                purchaseDate: purchase.purchaseDate,
            }));

            setPurchases(data);
        } catch (error) {
            console.error("LOAD PURCHASES ERROR:", error);

            toast.error("Failed to load purchase history.");
        } finally {
            setPurchaseLoading(false);
        }
    }

    const filteredProducts = useMemo(() => {
        const value = search.trim().toLowerCase();

        if (!value) {
            return products;
        }

        return products.filter(
            (product) =>
                product.name.toLowerCase().includes(value) ||
                product.code.toLowerCase().includes(value)
        );
    }, [products, search]);

    function handleProductChange(productId: number | "") {
        setSelectedProductId(productId);

        if (productId === "") {
            setUnitPrice(0);
            return;
        }

        const product = products.find((item) => item.id === productId);

        if (product) {
            setUnitPrice(product.purchasePrice);
        }
    }

    function addItem() {
        if (selectedProductId === "") {
            toast.error("Please select a product.");
            return;
        }

        if (quantity <= 0) {
            toast.error("Quantity must be greater than zero.");
            return;
        }

        if (unitPrice < 0) {
            toast.error("Unit price cannot be negative.");
            return;
        }

        const product = products.find(
            (item) => item.id === selectedProductId
        );

        if (!product) {
            toast.error("Product not found.");
            return;
        }

        const existingIndex = items.findIndex(
            (item) => item.productId === product.id
        );

        if (existingIndex >= 0) {
            const updatedItems = [...items];

            updatedItems[existingIndex] = {
                ...updatedItems[existingIndex],
                quantity:
                    updatedItems[existingIndex].quantity + quantity,
                unitPrice,
                discount: itemDiscount,
            };

            setItems(updatedItems);
        } else {
            setItems([
                ...items,
                {
                    productId: product.id,
                    code: product.code,
                    name: product.name,
                    quantity,
                    unitPrice,
                    discount: itemDiscount,
                },
            ]);
        }

        setSelectedProductId("");
        setQuantity(1);
        setUnitPrice(0);
        setItemDiscount(0);
        setSearch("");
    }

    function removeItem(productId: number) {
        setItems((current) =>
            current.filter((item) => item.productId !== productId)
        );
    }

    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => {
            const lineTotal =
                item.quantity * item.unitPrice - item.discount;

            return sum + Math.max(lineTotal, 0);
        }, 0);
    }, [items]);

    const total = useMemo(() => {
        return Math.max(subtotal + tax - discount, 0);
    }, [subtotal, tax, discount]);

    const balance = Math.max(total - paidAmount, 0);

    const filteredPurchases = useMemo(() => {
        const value = purchaseSearch.trim().toLowerCase();

        if (!value) {
            return purchases;
        }

        return purchases.filter((purchase) => {
            return (
                purchase.purchaseNo.toLowerCase().includes(value) ||
                purchase.supplier.code.toLowerCase().includes(value) ||
                purchase.supplier.name.toLowerCase().includes(value)
            );
        });
    }, [purchases, purchaseSearch]);

    function formatMoney(value: number) {
        return value.toLocaleString("en-LK", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }


    async function recordPurchasePayment() {
        if (!selectedPurchase) return;

        const amount = Number(paymentAmountInput);

        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error("Enter a valid payment amount.");
            return;
        }

        if (amount > Number(selectedPurchase.balanceAmount)) {
            toast.error("Payment cannot exceed the outstanding balance.");
            return;
        }

        try {
            setPaymentSaving(true);

            const response = await fetch(
                `/api/purchases/${selectedPurchase.id}/payment`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        amount,
                        paymentMethodType: additionalPaymentMethod,
                        reference: additionalPaymentReference,
                        note: additionalPaymentNote,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Unable to record payment."
                );
            }

            const refreshResponse = await fetch("/api/purchases", {
                cache: "no-store",
            });

            const refreshResult = await refreshResponse.json();

            if (!refreshResponse.ok || !refreshResult.success) {
                throw new Error(
                    "Payment was saved, but purchase details could not be refreshed. Please refresh the page."
                );
            }

            const updatedPurchases = (refreshResult.data ?? []).map(
                (purchase: any) => ({
                    ...purchase,
                    subtotal: Number(purchase.subtotal),
                    discount: Number(purchase.discount),
                    tax: Number(purchase.tax),
                    total: Number(purchase.total),
                    paidAmount: Number(purchase.paidAmount),
                    balanceAmount: Number(purchase.balanceAmount),
                })
            );

            setPurchases(updatedPurchases);

            const updatedPurchase = updatedPurchases.find(
                (purchase: PurchaseRecord) =>
                    purchase.id === selectedPurchase.id
            );

            if (updatedPurchase) {
                setSelectedPurchase(updatedPurchase);
            }

            setPaymentAmountInput("");
            setAdditionalPaymentReference("");
            setAdditionalPaymentNote("");
            setShowPaymentForm(false);

            toast.success("Purchase payment recorded successfully.");
        } catch (error) {
            console.error("PURCHASE PAYMENT ERROR:", error);

            toast.error(
                error instanceof Error
                    ? error.message
                    : "Unable to record payment."
            );
        } finally {
            setPaymentSaving(false);
        }
    }


    async function savePurchase() {
        if (supplierId === "") {
            toast.error("Please select a supplier.");
            return;
        }

        if (items.length === 0) {
            toast.error("Please add at least one product.");
            return;
        }

        if (paidAmount > total) {
            toast.error("Paid amount cannot exceed total.");
            return;
        }

        try {
            setSaving(true);

            const response = await fetch("/api/purchases", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    supplierId,
                    purchaseDate,
                    items: items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discount: item.discount,
                    })),
                    discount,
                    tax,
                    paidAmount,
                    paymentMethodType:
                        paidAmount > 0 ? paymentMethod : undefined,
                    paymentReference:
                        paidAmount > 0 ? paymentReference : undefined,
                    paymentNote:
                        paidAmount > 0 ? paymentNote : undefined,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Unable to save purchase."
                );
            }

            toast.success("Purchase created successfully.", {
                description: result.data?.purchaseNo
                    ? `Purchase ${result.data.purchaseNo} saved successfully.`
                    : "Purchase saved successfully.",
            });

            setItems([]);
            setSupplierId("");
            setDiscount(0);
            setTax(0);
            setPaidAmount(0);
            setPaymentReference("");
            setPaymentNote("");
            setPaymentMethod("CASH");

            await loadProducts();
            await loadPurchases();
        } catch (error) {
            console.error("PURCHASE SAVE ERROR:", error);

            toast.error("Purchase could not be saved.", {
                description:
                    error instanceof Error
                        ? error.message
                        : "Unknown error.",
            });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-sm font-medium text-slate-500">
                    Loading purchase data...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <PackagePlus className="h-5 w-5" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-black text-slate-900">
                                Purchase Entry
                            </h1>

                            <p className="text-sm text-slate-500">
                                Receive products and update stock.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Purchase Details */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-emerald-600" />

                    <h2 className="text-base font-bold text-slate-900">
                        Purchase Details
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            Supplier
                        </label>

                        <select
                            value={supplierId}
                            onChange={(event) =>
                                setSupplierId(
                                    event.target.value
                                        ? Number(event.target.value)
                                        : ""
                                )
                            }
                            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        >
                            <option value="">Select supplier</option>

                            {suppliers.map((supplier) => (
                                <option
                                    key={supplier.id}
                                    value={supplier.id}
                                >
                                    {supplier.code} - {supplier.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            Purchase Date
                        </label>

                        <div className="relative">
                            <CalendarDays className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />

                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(event) =>
                                    setPurchaseDate(event.target.value)
                                }
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Product */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-emerald-600" />

                    <h2 className="text-base font-bold text-slate-900">
                        Add Products
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            Search Product
                        </label>

                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />

                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search code or product..."
                                className="h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-4">
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            Product
                        </label>

                        <select
                            value={selectedProductId}
                            onChange={(event) =>
                                handleProductChange(
                                    event.target.value
                                        ? Number(event.target.value)
                                        : ""
                                )
                            }
                            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        >
                            <option value="">Select product</option>

                            {filteredProducts.map((product) => (
                                <option
                                    key={product.id}
                                    value={product.id}
                                >
                                    {product.code} - {product.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="lg:col-span-1">
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            Qty
                        </label>

                        <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={quantity}
                            onChange={(event) =>
                                setQuantity(Number(event.target.value))
                            }
                            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>

                    <div className="lg:col-span-2">
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            Unit Price
                        </label>

                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={unitPrice}
                            onChange={(event) =>
                                setUnitPrice(Number(event.target.value))
                            }
                            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>

                    <div className="lg:col-span-1">
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                            Disc.
                        </label>

                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={itemDiscount}
                            onChange={(event) =>
                                setItemDiscount(Number(event.target.value))
                            }
                            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={addItem}
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
                    >
                        <Plus className="h-4 w-4" />
                        Add Product
                    </button>
                </div>
            </div>

            {/* Items */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="font-bold text-slate-900">
                        Purchase Items
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-slate-50">
                            <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                <th className="px-5 py-3">Product</th>
                                <th className="px-5 py-3 text-right">Qty</th>
                                <th className="px-5 py-3 text-right">Unit Price</th>
                                <th className="px-5 py-3 text-right">Discount</th>
                                <th className="px-5 py-3 text-right">Total</th>
                                <th className="px-5 py-3 text-center">Action</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {items.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-5 py-12 text-center text-sm text-slate-400"
                                    >
                                        No products added yet.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => {
                                    const lineTotal = Math.max(
                                        item.quantity * item.unitPrice -
                                        item.discount,
                                        0
                                    );

                                    return (
                                        <tr key={item.productId}>
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-slate-900">
                                                    {item.name}
                                                </div>

                                                <div className="text-xs text-slate-500">
                                                    {item.code}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                {item.quantity}
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                Rs. {formatMoney(item.unitPrice)}
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                Rs. {formatMoney(item.discount)}
                                            </td>

                                            <td className="px-5 py-4 text-right font-bold">
                                                Rs. {formatMoney(lineTotal)}
                                            </td>

                                            <td className="px-5 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeItem(item.productId)
                                                    }
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50"
                                                    title="Remove"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Totals + Payment */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-5 font-bold text-slate-900">
                        Payment
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Payment Method
                            </label>

                            <select
                                value={paymentMethod}
                                onChange={(event) =>
                                    setPaymentMethod(event.target.value)
                                }
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                            >
                                <option value="CASH">Cash</option>
                                <option value="CARD">Card</option>
                                <option value="BANK_TRANSFER">
                                    Bank Transfer
                                </option>
                                <option value="ONLINE">Online</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Paid Amount
                            </label>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={paidAmount}
                                onChange={(event) =>
                                    setPaidAmount(Number(event.target.value))
                                }
                                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Reference
                            </label>

                            <input
                                value={paymentReference}
                                onChange={(event) =>
                                    setPaymentReference(event.target.value)
                                }
                                placeholder="Optional"
                                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Note
                            </label>

                            <textarea
                                value={paymentNote}
                                onChange={(event) =>
                                    setPaymentNote(event.target.value)
                                }
                                rows={3}
                                placeholder="Optional"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-5 font-bold text-slate-900">
                        Purchase Summary
                    </h2>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">
                                Subtotal
                            </span>

                            <span className="font-semibold">
                                Rs. {formatMoney(subtotal)}
                            </span>
                        </div>

                        <div>
                            <label className="mb-1.5 block font-semibold text-slate-700">
                                Discount
                            </label>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={discount}
                                onChange={(event) =>
                                    setDiscount(Number(event.target.value))
                                }
                                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block font-semibold text-slate-700">
                                Tax
                            </label>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={tax}
                                onChange={(event) =>
                                    setTax(Number(event.target.value))
                                }
                                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div className="flex justify-between border-t border-slate-200 pt-4">
                            <span className="font-bold text-slate-900">
                                Total
                            </span>

                            <span className="text-xl font-black text-emerald-700">
                                Rs. {formatMoney(total)}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-500">
                                Paid
                            </span>

                            <span className="font-semibold">
                                Rs. {formatMoney(paidAmount)}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-500">
                                Balance
                            </span>

                            <span className="font-bold text-orange-600">
                                Rs. {formatMoney(balance)}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={savePurchase}
                        disabled={saving || items.length === 0}
                        className="mt-6 h-12 w-full rounded-xl bg-emerald-600 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? "Saving Purchase..." : "Save Purchase"}
                    </button>
                </div>
            </div>
            {/* Purchase History */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            Purchase History
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            View previously created purchases.
                        </p>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />

                        <input
                            value={purchaseSearch}
                            onChange={(event) =>
                                setPurchaseSearch(event.target.value)
                            }
                            placeholder="Search purchase or supplier..."
                            className="h-10 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>
                </div>

                {purchaseLoading ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-500">
                        Loading purchase history...
                    </div>
                ) : filteredPurchases.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-400">
                        No purchases found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px]">
                            <thead className="bg-slate-50">
                                <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                    <th className="px-5 py-3">
                                        Purchase No
                                    </th>

                                    <th className="px-5 py-3">
                                        Date
                                    </th>

                                    <th className="px-5 py-3">
                                        Supplier
                                    </th>

                                    <th className="px-5 py-3 text-center">
                                        Items
                                    </th>

                                    <th className="px-5 py-3 text-right">
                                        Total
                                    </th>

                                    <th className="px-5 py-3 text-right">
                                        Paid
                                    </th>

                                    <th className="px-5 py-3 text-right">
                                        Balance
                                    </th>

                                    <th className="px-5 py-3 text-center">
                                        Status
                                    </th>

                                    <th className="px-5 py-3 text-center">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filteredPurchases.map((purchase) => (
                                    <tr
                                        key={purchase.id}
                                        className="transition hover:bg-slate-50"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-slate-900">
                                                {purchase.purchaseNo}
                                            </div>

                                            <div className="text-xs text-slate-400">
                                                #{purchase.id}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {new Date(
                                                purchase.purchaseDate
                                            ).toLocaleDateString("en-LK")}
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-slate-900">
                                                {purchase.supplier.name}
                                            </div>

                                            <div className="text-xs text-slate-500">
                                                {purchase.supplier.code}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-center text-sm font-semibold">
                                            {purchase.purchaseitem.length}
                                        </td>

                                        <td className="px-5 py-4 text-right font-bold">
                                            Rs. {formatMoney(purchase.total)}
                                        </td>

                                        <td className="px-5 py-4 text-right text-sm">
                                            Rs. {formatMoney(purchase.paidAmount)}
                                        </td>

                                        <td className="px-5 py-4 text-right text-sm font-semibold">
                                            Rs. {formatMoney(purchase.balanceAmount)}
                                        </td>

                                        <td className="px-5 py-4 text-center">
                                            <span
                                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${purchase.status === "PAID"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : purchase.status === "PARTIAL"
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-slate-100 text-slate-700"
                                                    }`}
                                            >
                                                {purchase.status}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPurchase(purchase)}
                                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
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

            {/* Purchase Details Modal */}
            {selectedPurchase && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
                    onClick={() => setSelectedPurchase(null)}
                >
                    <div
                        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-900">
                                    Purchase Details
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    {selectedPurchase.purchaseNo}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedPurchase(null)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-6 p-6">
                            {/* Purchase Information */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-xs font-semibold text-slate-500">
                                        Purchase No
                                    </p>

                                    <p className="mt-1 font-black text-slate-900">
                                        {selectedPurchase.purchaseNo}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-xs font-semibold text-slate-500">
                                        Supplier
                                    </p>

                                    <p className="mt-1 font-bold text-slate-900">
                                        {selectedPurchase.supplier.name}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                        {selectedPurchase.supplier.code}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-xs font-semibold text-slate-500">
                                        Purchase Date
                                    </p>

                                    <p className="mt-1 font-bold text-slate-900">
                                        {new Date(
                                            selectedPurchase.purchaseDate
                                        ).toLocaleDateString("en-LK")}
                                    </p>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                                    <h3 className="font-bold text-slate-900">
                                        Purchase Items
                                    </h3>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[700px]">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                                <th className="px-4 py-3">
                                                    Product
                                                </th>

                                                <th className="px-4 py-3 text-right">
                                                    Qty
                                                </th>

                                                <th className="px-4 py-3 text-right">
                                                    Unit Price
                                                </th>

                                                <th className="px-4 py-3 text-right">
                                                    Discount
                                                </th>

                                                <th className="px-4 py-3 text-right">
                                                    Total
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100">
                                            {selectedPurchase.purchaseitem.map(
                                                (item) => (
                                                    <tr key={item.id}>
                                                        <td className="px-4 py-3">
                                                            <div className="font-semibold text-slate-900">
                                                                {item.product.name}
                                                            </div>

                                                            <div className="text-xs text-slate-500">
                                                                {item.product.code}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-3 text-right">
                                                            {item.quantity}
                                                        </td>

                                                        <td className="px-4 py-3 text-right">
                                                            Rs.{" "}
                                                            {formatMoney(
                                                                Number(item.unitPrice)
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-3 text-right">
                                                            Rs.{" "}
                                                            {formatMoney(
                                                                Number(item.discount)
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-3 text-right font-bold">
                                                            Rs.{" "}
                                                            {formatMoney(
                                                                Number(item.total)
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>

                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <h3 className="font-bold text-slate-900">
                                            Payment Details
                                        </h3>

                                        {Number(selectedPurchase.balanceAmount) > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setShowPaymentForm((current) => !current)}
                                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                                            >
                                                {showPaymentForm ? "Cancel" : "+ Add Payment"}
                                            </button>
                                        )}
                                    </div>

                                    {showPaymentForm && (
                                        <form
                                            className="mb-4 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                void recordPurchasePayment();
                                            }}
                                        >
                                            <div className="text-sm text-slate-600">
                                                Outstanding balance:{" "}
                                                <span className="font-bold text-orange-600">
                                                    Rs. {formatMoney(Number(selectedPurchase.balanceAmount))}
                                                </span>
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-sm font-semibold text-slate-700">
                                                    Payment Amount (Rs.)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    max={Number(selectedPurchase.balanceAmount)}
                                                    step="0.01"
                                                    required
                                                    value={paymentAmountInput}
                                                    onChange={(event) => setPaymentAmountInput(event.target.value)}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                                    placeholder="Enter payment amount"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-sm font-semibold text-slate-700">
                                                    Payment Method
                                                </label>
                                                <select
                                                    value={additionalPaymentMethod}
                                                    onChange={(event) => setAdditionalPaymentMethod(event.target.value)}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                                >
                                                    <option value="CASH">Cash</option>
                                                    <option value="CARD">Card</option>
                                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                                    <option value="ONLINE">Online</option>
                                                    <option value="CREDIT">Credit</option>
                                                    <option value="OTHER">Other</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-sm font-semibold text-slate-700">
                                                    Reference (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={additionalPaymentReference}
                                                    onChange={(event) => setAdditionalPaymentReference(event.target.value)}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                                    placeholder="Receipt or transaction reference"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-sm font-semibold text-slate-700">
                                                    Note (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={additionalPaymentNote}
                                                    onChange={(event) => setAdditionalPaymentNote(event.target.value)}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                                    placeholder="Payment note"
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={paymentSaving}
                                                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {paymentSaving ? "Saving Payment..." : "Save Payment"}
                                            </button>
                                        </form>
                                    )}


                                    {selectedPurchase.purchasepayment.length ===
                                        0 ? (
                                        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                                            No payment recorded.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {selectedPurchase.purchasepayment.map(
                                                (payment) => (
                                                    <div
                                                        key={payment.id}
                                                        className="rounded-xl border border-slate-200 p-4"
                                                    >
                                                        <div className="flex justify-between">
                                                            <span className="text-sm text-slate-500">
                                                                Method
                                                            </span>

                                                            <span className="font-bold text-slate-900">
                                                                {payment.paymentmethod.name}
                                                            </span>
                                                        </div>

                                                        <div className="mt-2 flex justify-between">
                                                            <span className="text-sm text-slate-500">
                                                                Amount
                                                            </span>

                                                            <span className="font-black text-emerald-700">
                                                                Rs.{" "}
                                                                {formatMoney(
                                                                    Number(payment.amount)
                                                                )}
                                                            </span>
                                                        </div>

                                                        {payment.reference && (
                                                            <div className="mt-2 text-xs text-slate-500">
                                                                Reference:{" "}
                                                                <span className="font-semibold text-slate-700">
                                                                    {payment.reference}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {payment.note && (
                                                            <div className="mt-1 text-xs text-slate-500">
                                                                Note: {payment.note}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl bg-slate-50 p-5">
                                    <h3 className="mb-4 font-bold text-slate-900">
                                        Purchase Summary
                                    </h3>

                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">
                                                Subtotal
                                            </span>

                                            <span className="font-semibold">
                                                Rs.{" "}
                                                {formatMoney(
                                                    Number(selectedPurchase.subtotal)
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex justify-between">
                                            <span className="text-slate-500">
                                                Discount
                                            </span>

                                            <span className="font-semibold">
                                                Rs.{" "}
                                                {formatMoney(
                                                    Number(selectedPurchase.discount)
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex justify-between">
                                            <span className="text-slate-500">
                                                Tax
                                            </span>

                                            <span className="font-semibold">
                                                Rs.{" "}
                                                {formatMoney(
                                                    Number(selectedPurchase.tax)
                                                )}
                                            </span>
                                        </div>

                                        <div className="border-t border-slate-200 pt-3">
                                            <div className="flex justify-between">
                                                <span className="font-bold text-slate-900">
                                                    Total
                                                </span>

                                                <span className="text-xl font-black text-emerald-700">
                                                    Rs.{" "}
                                                    {formatMoney(
                                                        Number(selectedPurchase.total)
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between">
                                            <span className="text-slate-500">
                                                Paid
                                            </span>

                                            <span className="font-semibold">
                                                Rs.{" "}
                                                {formatMoney(
                                                    Number(selectedPurchase.paidAmount)
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex justify-between">
                                            <span className="text-slate-500">
                                                Balance
                                            </span>

                                            <span className="font-bold text-orange-600">
                                                Rs.{" "}
                                                {formatMoney(
                                                    Number(selectedPurchase.balanceAmount)
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex justify-between pt-2">
                                            <span className="text-slate-500">
                                                Status
                                            </span>

                                            <span className="font-bold text-emerald-700">
                                                {selectedPurchase.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}