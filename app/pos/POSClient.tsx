"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Grid2X2,
  Home,
  Loader2,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

// =========================================================
// TYPES
// =========================================================

type POSItem = {
  id: number;
  code: string;
  name: string;

  imageUrl: string | null;

  type: "PRODUCT" | "SERVICE";

  price: number;
  unit: string;
  category: string;
  brand: string;
  barcode: string | null;

  stock: number | null;
  minimumStock: number | null;

  tax: {
    id: number;
    name: string;
    rate: number;
  } | null;
};

type CartItem = POSItem & {
  quantity: number;
};

type Category = {
  name: string;
  count: number;
};

type POSCustomer = {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type PaymentMethod =
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "ONLINE"
  | "CREDIT"
  | "OTHER";

type ReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type CompletedSaleReceipt = {
  saleId: number | null;
  saleNumber: string;
  date: string;
  time: string;
  customer: string;
  paymentMethod: PaymentMethod;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
};

// =========================================================
// CATEGORY ICONS
// =========================================================

const categoryIcons = [
  "📄",
  "🖨️",
  "🎨",
  "📱",
  "📚",
  "🛍️",
  "✂️",
  "📦",
];

// =========================================================
// COMPONENT
// =========================================================

export default function POSClient() {
  const router = useRouter();

  // =======================================================
  // STATE
  // =======================================================

  const [items, setItems] = useState<POSItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<POSCustomer[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customer, setCustomer] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState("");

  // Stores the most recently saved sale for printing a real receipt.
  const [lastCompletedSale, setLastCompletedSale] =
    useState<CompletedSaleReceipt | null>(null);

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // IMPORTANT:
  // This is UI-only processing.
  // Nothing is saved to database.
  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");

  // =======================================================
  // LOAD POS ITEMS
  // =======================================================

  async function loadItems(searchValue = "") {
    try {
      setError("");

      if (searchValue.trim()) {
        setSearching(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams();

      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
      }

      const queryString = params.toString();

      const response = await fetch(
        queryString
          ? `/api/pos/items?${queryString}`
          : "/api/pos/items",
        {
          cache: "no-store",
        }
      );

      const responseText = await response.text();

      let result: {
        success?: boolean;
        data?: POSItem[];
        message?: string;
      } = {};

      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(
            "Server returned an invalid response."
          );
        }
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            `Unable to load POS items. Server returned ${response.status}.`
        );
      }

      setItems(result.data ?? []);
    } catch (error) {
      console.error(
        "LOAD POS ITEMS ERROR:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to load POS items.";

      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }

  // =======================================================
  // INITIAL LOAD + SEARCH
  // =======================================================

  // =======================================================
// INITIAL LOAD + SEARCH + CUSTOMERS
// =======================================================

useEffect(() => {
  const timer = setTimeout(() => {
    loadItems(search);
  }, 250);

  return () => {
    clearTimeout(timer);
  };
}, [search]);

useEffect(() => {
  async function loadCustomers() {
    try {
      const response = await fetch(
        "/api/pos/customers",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to load customers."
        );
      }

      setCustomers(result.data ?? []);
    } catch (error) {
      console.error(
        "LOAD POS CUSTOMERS ERROR:",
        error
      );

      toast.error(
        "Unable to load customers."
      );
    }
  }

  loadCustomers();
}, []);

  // =======================================================
  // CATEGORIES
  // =======================================================

  const categories = useMemo<Category[]>(() => {
    const map = new Map<string, number>();

    items.forEach((item) => {
      const category =
        item.category?.trim() ||
        (item.type === "SERVICE"
          ? "Services"
          : "Other");

      map.set(
        category,
        (map.get(category) || 0) + 1
      );
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );
  }, [items]);

  // =======================================================
  // FILTERED ITEMS
  // =======================================================

  const filteredItems = useMemo(() => {
    if (selectedCategory === "All") {
      return items;
    }

    return items.filter((item) => {
      const category =
        item.category?.trim() ||
        (item.type === "SERVICE"
          ? "Services"
          : "Other");

      return category === selectedCategory;
    });
  }, [
    items,
    selectedCategory,
  ]);

  // =======================================================
  // ADD TO CART
  // =======================================================

  function addToCart(item: POSItem) {
    setError("");

    // A new order should not keep the previous sale's receipt.
    setLastCompletedSale(null);

    if (
      item.type === "PRODUCT" &&
      item.stock !== null &&
      item.stock <= 0
    ) {
      toast.error(
        `${item.name} is out of stock.`
      );

      return;
    }

    setCart((current) => {
      const existing = current.find(
        (cartItem) =>
          cartItem.id === item.id &&
          cartItem.type === item.type
      );

      if (existing) {
        const newQuantity =
          existing.quantity + 1;

        if (
          item.type === "PRODUCT" &&
          item.stock !== null &&
          newQuantity > item.stock
        ) {
          toast.warning(
            `Only ${item.stock} ${item.unit} available for ${item.name}.`
          );

          return current;
        }

        return current.map(
          (cartItem) =>
            cartItem.id === item.id &&
            cartItem.type === item.type
              ? {
                  ...cartItem,
                  quantity: newQuantity,
                }
              : cartItem
        );
      }

      return [
        ...current,
        {
          ...item,
          quantity: 1,
        },
      ];
    });
  }

  // =======================================================
  // INCREASE QUANTITY
  // =======================================================

  function increaseQuantity(item: CartItem) {
    if (
      item.type === "PRODUCT" &&
      item.stock !== null &&
      item.quantity >= item.stock
    ) {
      toast.warning(
        `Only ${item.stock} ${item.unit} available for ${item.name}.`
      );

      return;
    }

    setCart((current) =>
      current.map((cartItem) =>
        cartItem.id === item.id &&
        cartItem.type === item.type
          ? {
              ...cartItem,
              quantity:
                cartItem.quantity + 1,
            }
          : cartItem
      )
    );
  }

  // =======================================================
  // DECREASE QUANTITY
  // =======================================================

  function decreaseQuantity(item: CartItem) {
    setCart((current) =>
      current
        .map((cartItem) =>
          cartItem.id === item.id &&
          cartItem.type === item.type
            ? {
                ...cartItem,
                quantity:
                  cartItem.quantity - 1,
              }
            : cartItem
        )
        .filter(
          (cartItem) =>
            cartItem.quantity > 0
        )
    );
  }

  // =======================================================
  // REMOVE ITEM
  // =======================================================

  function removeItem(item: CartItem) {
    setCart((current) =>
      current.filter(
        (cartItem) =>
          !(
            cartItem.id === item.id &&
            cartItem.type === item.type
          )
      )
    );
  }

  // =======================================================
  // CLEAR CART
  // =======================================================

  function clearCart() {
    setCart([]);
    setCustomerId(null);
    setCustomer("");
    setPaymentMethod("CASH");
    setDiscount("");
  }

  // =======================================================
  // TOTALS
  // =======================================================

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
    [cart]
  );

  const taxTotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const amount = item.price * item.quantity;
        return sum + amount * ((item.tax?.rate ?? 0) / 100);
      }, 0),
    [cart]
  );

  const discountAmount = Math.max(Number(discount) || 0, 0);
  const total = Math.max(subtotal + taxTotal - discountAmount, 0);

  const cartQuantity = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  // =======================================================
  // FORMAT PRICE
  // =======================================================

  function formatPrice(value: number) {
    return value.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // =======================================================
  // ESCAPE HTML
  // =======================================================

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // =======================================================
  // PRODUCT ICON
  // =======================================================

  function getProductIcon(
    item: POSItem,
    index: number
  ) {
    if (item.type === "SERVICE") {
      return "✦";
    }

    return categoryIcons[
      index % categoryIcons.length
    ];
  }

  // =======================================================
  // PRINT RECEIPT
  //
  // If a sale has just been saved, this prints the real saved
  // sale receipt using its invoice number.
  //
  // If there is only a current cart, it prints a preview.
  // =======================================================

  function printReceipt() {
    const savedReceipt = lastCompletedSale;

    if (!savedReceipt && cart.length === 0) {
      toast.warning("No completed sale available for printing.");
      return;
    }

    let receiptData: CompletedSaleReceipt;

    if (savedReceipt) {
      receiptData = savedReceipt;
    } else {
      if (
        !Number.isFinite(discountAmount) ||
        discountAmount < 0
      ) {
        toast.error("Invalid discount amount.");
        return;
      }

      if (discountAmount > subtotal + taxTotal) {
        toast.error(
          "Discount cannot be greater than subtotal + tax."
        );
        return;
      }

      for (const item of cart) {
        if (
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0
        ) {
          toast.error(
            `Invalid quantity for ${item.name}.`
          );
          return;
        }

        if (
          item.type === "PRODUCT" &&
          item.stock !== null &&
          item.quantity > item.stock
        ) {
          toast.error(
            `Insufficient stock for ${item.name}. Current stock: ${item.stock}.`
          );
          return;
        }
      }

      const now = new Date();

      const selectedCustomer =
        customerId !== null
          ? customers.find(
              (item) => item.id === customerId
            )
          : null;

      receiptData = {
        saleId: null,
        saleNumber: "PREVIEW",
        date: now.toLocaleDateString("en-LK"),
        time: now.toLocaleTimeString("en-LK", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        customer:
          selectedCustomer?.name ||
          customer.trim() ||
          "Walk-in Customer",
        paymentMethod,
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity,
        })),
        subtotal,
        tax: taxTotal,
        discount: discountAmount,
        total,
      };
    }

    const receiptWindow = window.open(
      "",
      "_blank",
      "width=420,height=750"
    );

    if (!receiptWindow) {
      toast.error(
        "Receipt print කිරීම සඳහා browser pop-up allow කරන්න."
      );
      return;
    }

    const receiptItems = receiptData.items
      .map(
        (item) => `
          <tr>
            <td class="item-name">
              ${escapeHtml(item.name)}
            </td>

            <td class="qty">
              ${item.quantity}
            </td>

            <td class="price">
              ${formatPrice(item.total)}
            </td>
          </tr>
        `
      )
      .join("");

    const paymentLabel =
      receiptData.paymentMethod.replace(
        /_/g,
        " "
      );

    const previewBlock =
      receiptData.saleNumber === "PREVIEW"
        ? `
          <div class="preview">
            PREVIEW RECEIPT
            <br />
            Sale has NOT been saved.
          </div>
        `
        : `
          <div class="saved">
            SAVED SALE
          </div>
        `;

    receiptWindow.document.write(`
      <!DOCTYPE html>

      <html>

        <head>

          <meta charset="UTF-8" />

          <title>
            ${escapeHtml(
              receiptData.saleNumber === "PREVIEW"
                ? "Pubudu Creative Hub Receipt Preview"
                : `Pubudu Creative Hub - ${receiptData.saleNumber}`
            )}
          </title>

          <style>

            @page {
              size: 80mm auto;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              width: 80mm;
              background: #ffffff;
              color: #000000;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
            }

            body {
              padding: 4mm;
              font-size: 11px;
            }

            .receipt {
              width: 100%;
            }

            .center {
              text-align: center;
            }

            .store-name {
              font-size: 18px;
              font-weight: 900;
              letter-spacing: 0.2px;
              margin-bottom: 4px;
            }

            .store-info {
              font-size: 9px;
              line-height: 1.5;
            }

            .receipt-title {
              margin-top: 8px;
              font-size: 13px;
              font-weight: 900;
            }

            .invoice-number {
              margin-top: 5px;
              font-size: 11px;
              font-weight: 900;
            }

            .line {
              border-top: 1px dashed #000;
              margin: 7px 0;
            }

            .info {
              font-size: 9px;
              line-height: 1.6;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 7px;
            }

            th {
              border-bottom:
                1px dashed #000;
              padding-bottom: 5px;
              font-size: 9px;
              text-align: left;
            }

            td {
              padding: 4px 0;
              vertical-align: top;
              font-size: 9px;
            }

            .item-name {
              width: 55%;
              padding-right: 3px;
              word-break: break-word;
            }

            .qty {
              width: 15%;
              text-align: center;
            }

            .price {
              width: 30%;
              text-align: right;
            }

            .summary {
              margin-top: 7px;
              font-size: 10px;
            }

            .summary-row {
              display: flex;
              justify-content:
                space-between;
              margin: 4px 0;
            }

            .total {
              font-size: 15px;
              font-weight: 900;
              margin-top: 7px;
              padding-top: 7px;
              border-top:
                1px solid #000;
            }

            .footer {
              margin-top: 13px;
              text-align: center;
              font-size: 9px;
              line-height: 1.6;
            }

            .preview {
              margin-top: 9px;
              font-size: 8px;
              font-weight: 700;
            }

            .saved {
              margin-top: 9px;
              font-size: 8px;
              font-weight: 700;
            }

            @media print {

              body {
                width: 80mm;
              }

              .no-print {
                display: none !important;
              }

            }

          </style>

        </head>

        <body>

          <div class="receipt">

            <div class="center">

              <div class="store-name">
                PUBUDU CREATIVE HUB
              </div>

              <div class="store-info">
                Printing • Designing • Stationery
              </div>

              <div class="store-info">
                Phone Accessories • POS
              </div>

              <div class="receipt-title">
                SALES RECEIPT
              </div>

              <div class="invoice-number">
                ${escapeHtml(receiptData.saleNumber)}
              </div>

            </div>

            <div class="line"></div>

            <div class="info">

              <strong>Date:</strong>
              ${escapeHtml(receiptData.date)}

              <br />

              <strong>Time:</strong>
              ${escapeHtml(receiptData.time)}

              <br />

              <strong>Customer:</strong>
              ${escapeHtml(receiptData.customer)}

              <br />

              <strong>Payment:</strong>
              ${escapeHtml(paymentLabel)}

            </div>

            <div class="line"></div>

            <table>

              <thead>

                <tr>

                  <th>
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

                ${receiptItems}

              </tbody>

            </table>

            <div class="line"></div>

            <div class="summary">

              <div class="summary-row">

                <span>
                  Subtotal
                </span>

                <span>
                  Rs. ${formatPrice(
                    receiptData.subtotal
                  )}
                </span>

              </div>

              <div class="summary-row">

                <span>
                  Tax
                </span>

                <span>
                  Rs. ${formatPrice(
                    receiptData.tax
                  )}
                </span>

              </div>

              <div class="summary-row">

                <span>
                  Discount
                </span>

                <span>
                  - Rs. ${formatPrice(
                    receiptData.discount
                  )}
                </span>

              </div>

              <div class="summary-row total">

                <span>
                  TOTAL
                </span>

                <span>
                  Rs. ${formatPrice(
                    receiptData.total
                  )}
                </span>

              </div>

            </div>

            <div class="footer">

              Thank you for your business!

              <br />

              Please visit us again.

              ${previewBlock}

            </div>

          </div>

          <script>

            window.onload = function() {

              setTimeout(
                function() {

                  window.print();

                  window.onafterprint =
                    function() {
                      window.close();
                    };

                },
                300
              );

            };

          </script>

        </body>

      </html>
    `);

    receiptWindow.document.close();
  }

  // =======================================================
  // COMPLETE SALE
  //
  // Saves:
  // - Sale
  // - Sale items
  // - Payment
  // - Stock movement
  // - Stock deduction
  // - Customer transaction (when applicable)
  // =======================================================

  async function completeSale() {
    if (cart.length === 0) {
      toast.warning("Cart is empty.");
      return;
    }

    if (
      !Number.isFinite(discountAmount) ||
      discountAmount < 0
    ) {
      toast.error("Invalid discount amount.");
      return;
    }

    if (discountAmount > subtotal + taxTotal) {
      toast.error(
        "Discount cannot be greater than subtotal + tax."
      );
      return;
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method.");
      return;
    }

    for (const item of cart) {
      if (
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0
      ) {
        toast.error(
          `Invalid quantity for ${item.name}.`
        );
        return;
      }

      if (
        item.type === "PRODUCT" &&
        item.stock !== null &&
        item.quantity > item.stock
      ) {
        toast.error(
          `Insufficient stock for ${item.name}. Current stock: ${item.stock}.`
        );
        return;
      }
    }

    try {
      setProcessing(true);
      setError("");

      const response = await fetch("/api/pos/sale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
          paymentMethod,
          discount: discountAmount,
          items: cart.map((item) => ({
            id: item.id,
            type: item.type,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
        }),
      });

      const responseText = await response.text();

      let result: {
        success?: boolean;
        message?: string;
        data?: {
          saleId?: number;
          invoiceNo?: string;
          saleNumber?: string;
          subtotal?: number;
          tax?: number;
          discount?: number;
          total?: number;
        };
      } = {};

      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(
            "Server returned an invalid response."
          );
        }
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            `Unable to complete sale. Server returned ${response.status}.`
        );
      }

      const saleReference =
        result.data?.invoiceNo ||
        result.data?.saleNumber ||
        (result.data?.saleId ? `#${result.data.saleId}` : "");

      const completedAt = new Date();

      const selectedCustomer =
        customerId !== null
          ? customers.find(
              (item) => item.id === customerId
            )
          : null;

      setLastCompletedSale({
        saleId: result.data?.saleId ?? null,
        saleNumber:
          result.data?.invoiceNo ||
          result.data?.saleNumber ||
          (result.data?.saleId ? `#${result.data.saleId}` : "SAVED SALE"),
        date:
          completedAt.toLocaleDateString("en-LK"),
        time:
          completedAt.toLocaleTimeString("en-LK", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        customer:
          selectedCustomer?.name ||
          customer.trim() ||
          "Walk-in Customer",
        paymentMethod,
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity,
        })),
        subtotal: Number(result.data?.subtotal ?? subtotal),
        tax: Number(result.data?.tax ?? taxTotal),
        discount: Number(result.data?.discount ?? discountAmount),
        total: Number(result.data?.total ?? total),
      });

      toast.success("Sale completed successfully.", {
        description: saleReference
          ? `Sale ${saleReference} saved. Total: Rs. ${formatPrice(total)}`
          : `Total: Rs. ${formatPrice(total)} saved successfully.`,
        duration: 5000,
      });

      // Refresh current stock after a successful sale.
      await loadItems(search);

      // Start a fresh POS order.
      clearCart();
    } catch (error) {
      console.error(
        "POS COMPLETE SALE ERROR:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to complete POS sale.";

      setError(message);

      toast.error("Sale could not be completed.", {
        description: message,
        duration: 5000,
      });
    } finally {
      setProcessing(false);
    }
  }

  // =======================================================
  // GO DASHBOARD
  // =======================================================

  function goDashboard() {
    router.push("/dashboard");
  }

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="min-h-screen bg-[#f4f7f6] text-slate-900">

      {/* ================================================= */}
      {/* POS HEADER */}
      {/* ================================================= */}

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">

        <div className="flex h-16 items-center gap-4 px-4 lg:px-6">

          {/* BRAND */}

          <div className="flex shrink-0 items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">

              <ShoppingCart className="h-5 w-5" />

            </div>

            <div className="hidden sm:block">

              <div className="flex items-center gap-2">

                <h1 className="text-sm font-black text-slate-900">
                  Pubudu POS
                </h1>

                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-700">
                  Online
                </span>

              </div>

              <p className="text-[9px] text-slate-400">
                Point of Sale
              </p>

            </div>

          </div>

          {/* SEARCH */}

          <div className="relative min-w-0 flex-1">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search product, code or barcode..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-xs outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-50"
            />

            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            )}

          </div>

          {/* ITEM COUNT */}

          <div className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 md:block">

            <p className="text-[8px] uppercase tracking-wide text-slate-400">
              Items
            </p>

            <p className="text-xs font-bold text-slate-700">
              {items.length}
            </p>

          </div>

          {/* HOME / DASHBOARD */}

          <button
            type="button"
            onClick={goDashboard}
            disabled={processing}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Go to Dashboard"
          >

            <Home className="h-4 w-4" />

            <span className="hidden lg:inline">
              Dashboard
            </span>

          </button>

          {/* EXIT POS */}

          <button
            type="button"
            onClick={goDashboard}
            disabled={processing}
            className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            title="Exit POS"
          >

            <X className="h-4 w-4" />

            <span className="hidden sm:inline">
              Exit POS
            </span>

          </button>

        </div>

      </header>

      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

      {error && (
        <div className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 lg:mx-6">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="rounded-md p-1 hover:bg-red-100"
          >

            <X className="h-4 w-4" />

          </button>

        </div>
      )}

      {/* ================================================= */}
      {/* MAIN POS */}
      {/* ================================================= */}

      <main className="p-4 lg:p-5">

        <div className="grid min-h-[calc(100vh-105px)] grid-cols-1 gap-5 xl:grid-cols-[210px_minmax(0,1fr)_400px]">

          {/* ================================================= */}
          {/* CATEGORY SIDEBAR */}
          {/* ================================================= */}

          <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-[84px] xl:h-[calc(100vh-105px)] xl:overflow-y-auto">

            <div className="mb-4 px-2">

              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Categories
              </p>

              <p className="mt-1 text-[9px] text-slate-400">
                Select category
              </p>

            </div>

            <div className="space-y-1.5">

              {/* ALL */}

              <button
                type="button"
                onClick={() =>
                  setSelectedCategory(
                    "All"
                  )
                }
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                  selectedCategory === "All"
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    selectedCategory === "All"
                      ? "bg-emerald-100"
                      : "bg-slate-100"
                  }`}
                >

                  <Grid2X2 className="h-4 w-4" />

                </div>

                <div className="min-w-0 flex-1">

                  <p className="text-xs font-bold">
                    All Items
                  </p>

                  <p className="mt-0.5 text-[9px] text-slate-400">
                    {items.length} items
                  </p>

                </div>

              </button>

              {/* CATEGORIES */}

              {categories.map(
                (category, index) => (
                  <button
                    key={category.name}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(
                        category.name
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                      selectedCategory ===
                      category.name
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >

                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                        selectedCategory ===
                        category.name
                          ? "bg-emerald-100"
                          : "bg-slate-100"
                      }`}
                    >

                      {
                        categoryIcons[
                          index %
                            categoryIcons.length
                        ]
                      }

                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-xs font-bold">
                        {category.name}
                      </p>

                      <p className="mt-0.5 text-[9px] text-slate-400">
                        {category.count} items
                      </p>

                    </div>

                  </button>
                )
              )}

            </div>

          </aside>

          {/* ================================================= */}
          {/* PRODUCTS */}
          {/* ================================================= */}

          <section className="min-w-0">

            <div className="mb-4 flex items-center justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <h2 className="text-lg font-black text-slate-900">
                    {selectedCategory === "All"
                      ? "Products"
                      : selectedCategory}
                  </h2>

                  <ChevronRight className="h-4 w-4 text-slate-400" />

                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Select a product to add to your order
                </p>

              </div>

              <div className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 shadow-sm ring-1 ring-slate-200">
                {filteredItems.length} items
              </div>

            </div>

            {/* LOADING */}

            {loading ? (
              <div className="flex min-h-[600px] items-center justify-center rounded-2xl border border-slate-200 bg-white">

                <div className="text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">

                    <Loader2 className="h-7 w-7 animate-spin text-slate-400" />

                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-700">
                    Loading products...
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Please wait
                  </p>

                </div>

              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex min-h-[600px] items-center justify-center rounded-2xl border border-slate-200 bg-white">

                <div className="text-center">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">

                    <Search className="h-7 w-7 text-slate-400" />

                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-700">
                    No items found
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Try another search or category.
                  </p>

                </div>

              </div>
            ) : (

              /* PRODUCT GRID */

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-4">

                {filteredItems.map(
                  (item, index) => {

                    const outOfStock =
                      item.type === "PRODUCT" &&
                      item.stock !== null &&
                      item.stock <= 0;

                    const lowStock =
                      item.type === "PRODUCT" &&
                      item.stock !== null &&
                      item.minimumStock !== null &&
                      item.stock > 0 &&
                      item.stock <=
                        item.minimumStock;

                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl"
                      >

                        {/* IMAGE */}

                        <div className="relative flex h-52 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">

                          {/* TYPE */}

                          <span
                            className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[8px] font-black uppercase shadow-sm ${
                              item.type === "PRODUCT"
                                ? "bg-white text-slate-600 ring-1 ring-slate-200"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {item.type}
                          </span>

                          {/* LOW STOCK */}

                          {lowStock && (
                            <span className="absolute right-3 top-3 z-10 rounded-full bg-amber-50 px-2.5 py-1 text-[8px] font-bold text-amber-700 ring-1 ring-amber-100">
                              Low Stock
                            </span>
                          )}

                          {/* OUT OF STOCK */}

                          {outOfStock && (
                            <span className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-red-50 px-3 py-1.5 text-[8px] font-bold text-red-600 ring-1 ring-red-100">
                              Out of Stock
                            </span>
                          )}

                          {/* IMAGE */}

                          <div className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-100">

                            {item.type === "PRODUCT" &&
                            item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                loading="lazy"
                                className="block h-full w-full object-contain p-1 transition duration-300 group-hover:scale-110"
                              />
                            ) : (
                              <span className="text-6xl">
                                {getProductIcon(
                                  item,
                                  index
                                )}
                              </span>
                            )}

                          </div>

                        </div>

                        {/* PRODUCT INFO */}

                        <div className="p-4">

                          <p className="truncate text-sm font-black text-slate-900">
                            {item.name}
                          </p>

                          <p className="mt-1 truncate text-[10px] font-medium text-slate-400">
                            {item.code}
                          </p>

                          <div className="mt-4 flex items-end justify-between gap-3">

                            <div className="min-w-0">

                              <p className="text-base font-black text-slate-900">
                                Rs.{" "}
                                {formatPrice(
                                  item.price
                                )}
                              </p>

                              <p className="mt-0.5 text-[9px] text-slate-400">
                                / {item.unit}
                              </p>

                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                addToCart(item)
                              }
                              disabled={
                                outOfStock ||
                                processing
                              }
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md transition hover:scale-105 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              <Plus className="h-5 w-5" />
                            </button>

                          </div>

                          {/* STOCK */}

                          {item.type ===
                            "PRODUCT" && (
                            <div className="mt-3 border-t border-slate-100 pt-2">

                              {outOfStock ? (
                                <span className="text-[9px] font-bold text-red-600">
                                  Out of stock
                                </span>
                              ) : (
                                <span className="text-[9px] font-medium text-slate-400">
                                  Stock:{" "}
                                  {item.stock}
                                </span>
                              )}

                            </div>
                          )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </section>

          {/* ================================================= */}
          {/* ORDER DETAILS */}
          {/* ================================================= */}

          <aside className="flex h-[calc(100vh-105px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-[84px]">

            {/* HEADER */}

            <div className="border-b border-slate-200 px-5 py-4">

              <div className="flex items-center justify-between">

                <div>

                  <div className="flex items-center gap-2">

                    <h2 className="text-base font-black text-slate-900">
                      Current Order
                    </h2>

                    {cart.length > 0 && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700">
                        {cartQuantity}
                      </span>
                    )}

                  </div>

                  <p className="mt-1 text-[9px] text-slate-400">
                    Current POS order
                  </p>

                </div>

                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    disabled={processing}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    title="Clear order"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

              </div>

            </div>

            {/* CUSTOMER */}

            <div className="border-b border-slate-100 p-4">

              <div className="mb-2 flex items-center justify-between">

                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Customer
                </label>

                <span className="text-[8px] text-slate-400">
                  Optional
                </span>

              </div>

              <div className="relative">

                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <select
                  value={customerId ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    const selectedId = value
                      ? Number(value)
                      : null;

                    setCustomerId(selectedId);

                    const selectedCustomer =
                      customers.find(
                        (item) =>
                          item.id === selectedId
                      );

                    setCustomer(
                      selectedCustomer?.name || ""
                    );
                  }}
                  disabled={processing}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs outline-none transition focus:border-emerald-400 focus:bg-white disabled:opacity-50"
                >
                  <option value="">
                    Walk-in Customer
                  </option>

                  {customers.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                      {item.phone
                        ? ` - ${item.phone}`
                        : ""}
                    </option>
                  ))}
                </select>

              </div>

              {customerId !== null && (
                <p className="mt-1.5 pl-1 text-[8px] text-slate-400">
                  Customer code:{" "}
                  {customers.find(
                    (item) =>
                      item.id === customerId
                  )?.code || "-"}
                </p>
              )}

            </div>

            {/* PAYMENT METHOD */}

            <div className="border-b border-slate-100 p-4">

              <div className="mb-2 flex items-center justify-between">

                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Payment Method
                </label>

                <span className="text-[8px] text-slate-400">
                  Required
                </span>

              </div>

              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(
                    event.target.value as PaymentMethod
                  )
                }
                disabled={processing}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-emerald-400 focus:bg-white disabled:opacity-50"
              >
                <option value="CASH">
                  Cash
                </option>
                <option value="CARD">
                  Card
                </option>
                <option value="BANK_TRANSFER">
                  Bank Transfer
                </option>
                <option value="ONLINE">
                  Online
                </option>
                <option value="CREDIT">
                  Credit
                </option>
                <option value="OTHER">
                  Other
                </option>
              </select>

            </div>

            {/* CART */}

            <div className="min-h-0 flex-1 overflow-y-auto">

              {cart.length === 0 ? (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center px-6 text-center">

                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">

                    <ShoppingCart className="h-7 w-7 text-slate-300" />

                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-700">
                    Your order is empty
                  </p>

                  <p className="mt-1 max-w-[210px] text-[10px] leading-5 text-slate-400">
                    Click a product from the catalog to add it to the order.
                  </p>

                </div>
              ) : (
                <div className="divide-y divide-slate-100">

                  {cart.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="px-4 py-3"
                    >

                      <div className="flex gap-3">

                        {/* CART IMAGE */}

                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">

                          {item.type ===
                            "PRODUCT" &&
                          item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              loading="lazy"
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-xl">
                              {item.type ===
                              "SERVICE"
                                ? "✦"
                                : "📦"}
                            </span>
                          )}

                        </div>

                        {/* DETAILS */}

                        <div className="min-w-0 flex-1">

                          <div className="flex items-start justify-between gap-2">

                            <div className="min-w-0">

                              <p className="truncate text-xs font-bold text-slate-900">
                                {item.name}
                              </p>

                              <p className="mt-0.5 text-[9px] text-slate-400">
                                Rs.{" "}
                                {formatPrice(
                                  item.price
                                )}
                              </p>

                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeItem(item)
                              }
                              disabled={processing}
                              className="shrink-0 text-slate-300 transition hover:text-red-500"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>

                          </div>

                          {/* QUANTITY */}

                          <div className="mt-2 flex items-center justify-between">

                            <div className="flex items-center rounded-lg border border-slate-200">

                              <button
                                type="button"
                                onClick={() =>
                                  decreaseQuantity(
                                    item
                                  )
                                }
                                disabled={processing}
                                className="flex h-7 w-7 items-center justify-center text-slate-500 hover:bg-slate-50"
                              >
                                <Minus className="h-3 w-3" />
                              </button>

                              <span className="flex h-7 min-w-8 items-center justify-center border-x border-slate-200 text-[10px] font-black text-slate-700">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  increaseQuantity(
                                    item
                                  )
                                }
                                disabled={processing}
                                className="flex h-7 w-7 items-center justify-center text-slate-500 hover:bg-slate-50"
                              >
                                <Plus className="h-3 w-3" />
                              </button>

                            </div>

                            <p className="text-xs font-black text-slate-900">
                              Rs.{" "}
                              {formatPrice(
                                item.price *
                                  item.quantity
                              )}
                            </p>

                          </div>

                        </div>

                      </div>

                    </div>
                  ))}

                </div>
              )}

            </div>

            {/* ================================================= */}
            {/* SUMMARY */}
            {/* ================================================= */}

            <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-4">
              

              {/* DISCOUNT */}

              <div className="mb-3 flex items-center justify-between">

                <span className="text-xs font-medium text-slate-500">
                  Discount
                </span>

                <div className="relative w-28">

                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">
                    Rs.
                  </span>

                  <input
                    type="number"
                    min="0"
                    max={subtotal + taxTotal}
                    value={discount}
                    onChange={(event) =>
                      setDiscount(
                        event.target.value
                      )
                    }
                    disabled={processing}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2 text-right text-xs outline-none focus:border-emerald-400"
                  />

                </div>

              </div>

              {/* SUBTOTAL */}

              <div className="space-y-2">

                <div className="flex items-center justify-between text-xs text-slate-500">

                  <span>
                    Subtotal
                  </span>

                  <span className="font-semibold">
                    Rs.{" "}
                    {formatPrice(
                      subtotal
                    )}
                  </span>

                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">

                  <span>
                    Tax
                  </span>

                  <span className="font-semibold">
                    Rs.{" "}
                    {formatPrice(taxTotal)}
                  </span>

                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">

                  <span>
                    Discount
                  </span>

                  <span className="font-semibold text-red-500">
                    - Rs.{" "}
                    {formatPrice(
                      discountAmount
                    )}
                  </span>

                </div>

                <div className="my-3 border-t border-dashed border-slate-200" />

                {/* TOTAL */}

                <div className="flex items-center justify-between">

                  <span className="text-sm font-black text-slate-900">
                    Total
                  </span>

                  <span className="text-2xl font-black text-slate-900">
                    Rs.{" "}
                    {formatPrice(total)}
                  </span>

                </div>

              </div>

              {/* ================================================= */}
              {/* SALE STATUS */}
              {/* ================================================= */}

              <div
                className={`mt-3 rounded-xl border px-3 py-2.5 ${
                  lastCompletedSale
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >

                <div className="flex items-center gap-2">

                  <div className="h-2 w-2 rounded-full bg-emerald-500" />

                  <p className="text-[9px] font-black text-emerald-700">
                    {lastCompletedSale
                      ? "SALE SAVED"
                      : "READY TO COMPLETE"}
                  </p>

                </div>

                <p className="mt-1 text-[8px] leading-4 text-emerald-600">
                  {lastCompletedSale
                    ? `Last sale ${lastCompletedSale.saleNumber} is saved. You can print the receipt below.`
                    : "Completing the sale saves the sale, payment, stock movement and stock deduction."}
                </p>

              </div>

              {/* ================================================= */}
              {/* PRINT RECEIPT */}
              {/* ================================================= */}

              <button
                type="button"
                onClick={printReceipt}
                disabled={
                  (cart.length === 0 &&
                    !lastCompletedSale) ||
                  processing
                }
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >

                <Printer className="h-4 w-4" />

                {lastCompletedSale &&
                cart.length === 0
                  ? "Print Last Receipt"
                  : "Print Receipt"}

              </button>

              {/* ================================================= */}
              {/* COMPLETE SALE */}
              {/* ================================================= */}

              <button
                type="button"
                onClick={completeSale}
                disabled={
                  cart.length === 0 ||
                  processing
                }
                className="mt-2 flex h-12 w-full items-center justify-between rounded-xl bg-emerald-500 px-4 text-white shadow-md transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >

                <div className="flex items-center gap-2">

                  {processing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}

                  <span className="text-xs font-black">
                    {processing
                      ? "Processing..."
                      : "Complete Sale"}
                  </span>

                </div>

                <div className="flex items-center gap-1">

                  <span className="text-xs">
                    Rs.
                  </span>

                  <span className="text-sm font-black">
                    {formatPrice(total)}
                  </span>

                  <ArrowRight className="ml-1 h-4 w-4" />

                </div>

              </button>

              {/* ================================================= */}
              {/* DASHBOARD */}
              {/* ================================================= */}

              <button
                type="button"
                onClick={goDashboard}
                disabled={processing}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >

                <Home className="h-4 w-4" />

                Back to Dashboard

              </button>

            </div>

          </aside>

        </div>

      </main>

    </div>
  );
}