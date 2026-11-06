"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  Banknote,
  BookOpen,
  CheckCircle2,
  Copy,
  CreditCard,
  FileText,
  Home,
  Layers,
  Loader2,
  Minus,
  Pencil,
  PenTool,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  ScanLine,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Trash2,
  UserPlus,
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

type CategoryInfo = {
  name: string;
  count: number;
  iconName: string;
  colorScheme: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    activeBg: string;
    activeText: string;
    activeRing: string;
  };
  description: string;
};

type POSCustomer = {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type PaymentMethodType =
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "ONLINE"
  | "CREDIT";

type CompletedSaleBill = {
  saleId: number | null;
  invoiceNo: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone?: string;
  paymentMethod: PaymentMethodType;
  items: Array<{
    name: string;
    code: string;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  cashTendered: number;
  changeAmount: number;
  reference?: string;
  note?: string;
};

// =========================================================
// CURRENCY FORMATTER (SRI LANKAN RUPEES - Rs.)
// =========================================================

function formatRs(amount: number): string {
  return (
    "Rs. " +
    amount.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// =========================================================
// CATEGORY CONFIGURATION (THE 7 SPECIFIED CATEGORIES)
// =========================================================

const CATEGORY_STYLES: Record<
  string,
  {
    icon: string;
    description: string;
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    activeBg: string;
    activeText: string;
    activeRing: string;
  }
> = {
  Photocopy: {
    icon: "Copy",
    description: "B&W & document photocopying",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    badgeBg: "bg-slate-200 text-slate-800",
    activeBg: "bg-slate-900",
    activeText: "text-white",
    activeRing: "ring-slate-900",
  },
  "Color printing": {
    icon: "Printer",
    description: "Laser color, glossy photos & prints",
    bg: "bg-fuchsia-50",
    text: "text-fuchsia-700",
    border: "border-fuchsia-200",
    badgeBg: "bg-fuchsia-100 text-fuchsia-800",
    activeBg: "bg-fuchsia-600",
    activeText: "text-white",
    activeRing: "ring-fuchsia-500",
  },
  Stationary: {
    icon: "PenTool",
    description: "Pens, books, papers & desk supplies",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badgeBg: "bg-amber-100 text-amber-800",
    activeBg: "bg-amber-600",
    activeText: "text-white",
    activeRing: "ring-amber-500",
  },
  "Mobile accessories": {
    icon: "Smartphone",
    description: "Cables, chargers, earphones & power banks",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    badgeBg: "bg-blue-100 text-blue-800",
    activeBg: "bg-blue-600",
    activeText: "text-white",
    activeRing: "ring-blue-500",
  },
  Binding: {
    icon: "BookOpen",
    description: "Spiral, hard cover & tape binding",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    badgeBg: "bg-emerald-100 text-emerald-800",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
    activeRing: "ring-emerald-500",
  },
  Laminating: {
    icon: "ShieldCheck",
    description: "NIC, A4, A3 document lamination",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    badgeBg: "bg-rose-100 text-rose-800",
    activeBg: "bg-rose-600",
    activeText: "text-white",
    activeRing: "ring-rose-500",
  },
  Scanning: {
    icon: "ScanLine",
    description: "Document & photo scan to PDF",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    badgeBg: "bg-sky-100 text-sky-800",
    activeBg: "bg-sky-600",
    activeText: "text-white",
    activeRing: "ring-sky-500",
  },
};

function renderCategoryIcon(categoryName: string, className = "h-4 w-4") {
  switch (categoryName) {
    case "Photocopy":
      return <Copy className={className} />;
    case "Color printing":
      return <Printer className={className} />;
    case "Stationary":
      return <PenTool className={className} />;
    case "Mobile accessories":
      return <Smartphone className={className} />;
    case "Binding":
      return <BookOpen className={className} />;
    case "Laminating":
      return <ShieldCheck className={className} />;
    case "Scanning":
      return <ScanLine className={className} />;
    default:
      return <Layers className={className} />;
  }
}

// =========================================================
// MAIN POS CLIENT COMPONENT
// =========================================================

export default function POSClient() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Data states
  const [items, setItems] = useState<POSItem[]>([]);
  const [customers, setCustomers] = useState<POSCustomer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Filter & Search states
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null
  );

  // Discount
  const [discountInput, setDiscountInput] = useState("");

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);

  // Payment form state
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodType>("CASH");
  const [cashTenderedInput, setCashTenderedInput] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  // New Customer form state
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Last completed sale / bill
  const [lastCompletedBill, setLastCompletedBill] =
    useState<CompletedSaleBill | null>(null);

  // Editable unit price in cart during transaction
  const [editingPriceKey, setEditingPriceKey] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<string>("");

  // Responsive Mobile Drawer
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // =======================================================
  // FETCH ITEMS & CUSTOMERS FROM DATABASE
  // =======================================================

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/pos/items", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load products.");
      }

      setItems(result.data || []);
    } catch (err) {
      console.error("LOAD POS ITEMS ERROR:", err);
      const msg = err instanceof Error ? err.message : "Failed to load items.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const response = await fetch("/api/pos/customers", {
        cache: "no-store",
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setCustomers(result.data || []);
      }
    } catch (err) {
      console.error("LOAD CUSTOMERS ERROR:", err);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initializePOS() {
      try {
        const [itemsRes, custRes] = await Promise.all([
          fetch("/api/pos/items", { cache: "no-store" }),
          fetch("/api/pos/customers", { cache: "no-store" }),
        ]);

        const itemsJson = await itemsRes.json();
        const custJson = await custRes.json();

        if (active) {
          if (itemsRes.ok && itemsJson.success) {
            setItems(itemsJson.data || []);
          }
          if (custRes.ok && custJson.success) {
            setCustomers(custJson.data || []);
          }
        }
      } catch (err) {
        console.error("INIT POS ERROR:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initializePOS();

    return () => {
      active = false;
    };
  }, []);

  // =======================================================
  // CATEGORIES GROUPING & ITEM COUNTS
  // =======================================================

  const categoryList = useMemo<CategoryInfo[]>(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const c = item.category?.trim() || "Other";
      counts[c] = (counts[c] || 0) + 1;
    }

    const targetList = [
      "Photocopy",
      "Color printing",
      "Stationary",
      "Mobile accessories",
      "Binding",
      "Laminating",
      "Scanning",
    ];

    const result: CategoryInfo[] = targetList.map((name) => {
      const styles = CATEGORY_STYLES[name] || {
        icon: "Layers",
        description: "Category resources",
        bg: "bg-slate-50",
        text: "text-slate-700",
        border: "border-slate-200",
        badgeBg: "bg-slate-100 text-slate-700",
        activeBg: "bg-slate-900",
        activeText: "text-white",
        activeRing: "ring-slate-900",
      };

      return {
        name,
        count: counts[name] || 0,
        iconName: styles.icon,
        colorScheme: styles,
        description: styles.description,
      };
    });

    // Add any other categories that might exist in DB
    for (const [name, count] of Object.entries(counts)) {
      if (!targetList.includes(name) && name !== "Other") {
        result.push({
          name,
          count,
          iconName: "Layers",
          colorScheme: {
            bg: "bg-gray-50",
            text: "text-gray-700",
            border: "border-gray-200",
            badgeBg: "bg-gray-100 text-gray-700",
            activeBg: "bg-gray-900",
            activeText: "text-white",
            activeRing: "ring-gray-900",
          },
          description: "Other items",
        });
      }
    }

    return result;
  }, [items]);

  // =======================================================
  // FILTERED PRODUCTS
  // =======================================================

  const filteredItems = useMemo(() => {
    let result = items;

    if (selectedCategory !== "All") {
      result = result.filter(
        (i) => (i.category?.trim() || "Other") === selectedCategory
      );
    }

    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.code.toLowerCase().includes(query) ||
          (i.barcode && i.barcode.toLowerCase().includes(query)) ||
          i.category.toLowerCase().includes(query)
      );
    }

    return result;
  }, [items, selectedCategory, search]);

  // =======================================================
  // CART TOTALS
  // =======================================================

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const taxTotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const lineTotal = item.price * item.quantity;
        const rate = item.tax?.rate || 0;
        return sum + (lineTotal * rate) / 100;
      }, 0),
    [cart]
  );

  const discountAmount = useMemo(() => {
    const val = Number(discountInput) || 0;
    return Math.max(0, Math.min(val, subtotal + taxTotal));
  }, [discountInput, subtotal, taxTotal]);

  const total = useMemo(
    () => Math.max(0, subtotal + taxTotal - discountAmount),
    [subtotal, taxTotal, discountAmount]
  );

  const totalItemsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // Cart quantity map for instant badge indicator on product cards
  const cartQuantityMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of cart) {
      map.set(item.id, item.quantity);
    }
    return map;
  }, [cart]);

  // =======================================================
  // CART ACTIONS
  // =======================================================

  const addToCart = useCallback((item: POSItem) => {
    if (item.type === "PRODUCT" && item.stock !== null && item.stock <= 0) {
      toast.error(`${item.name} is currently out of stock.`);
      return;
    }

    setCart((curr) => {
      const existing = curr.find(
        (c) => c.id === item.id && c.type === item.type
      );

      if (existing) {
        const nextQty = existing.quantity + 1;
        if (
          item.type === "PRODUCT" &&
          item.stock !== null &&
          nextQty > item.stock
        ) {
          toast.warning(
            `Maximum stock available for ${item.name} is ${item.stock} ${item.unit}.`
          );
          return curr;
        }

        return curr.map((c) =>
          c.id === item.id && c.type === item.type
            ? { ...c, quantity: nextQty }
            : c
        );
      }

      return [...curr, { ...item, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback(
    (item: CartItem, newQty: number) => {
      if (isNaN(newQty) || newQty <= 0) {
        // Remove item if 0
        setCart((curr) =>
          curr.filter((c) => !(c.id === item.id && c.type === item.type))
        );
        return;
      }

      if (
        item.type === "PRODUCT" &&
        item.stock !== null &&
        newQty > item.stock
      ) {
        toast.warning(
          `Only ${item.stock} ${item.unit} available for ${item.name}.`
        );
        newQty = item.stock;
      }

      setCart((curr) =>
        curr.map((c) =>
          c.id === item.id && c.type === item.type
            ? { ...c, quantity: newQty }
            : c
        )
      );
    },
    []
  );

  const increaseQuantity = useCallback(
    (item: CartItem) => {
      updateQuantity(item, item.quantity + 1);
    },
    [updateQuantity]
  );

  const decreaseQuantity = useCallback(
    (item: CartItem) => {
      updateQuantity(item, item.quantity - 1);
    },
    [updateQuantity]
  );

  const removeItem = useCallback((item: CartItem) => {
    setCart((curr) =>
      curr.filter((c) => !(c.id === item.id && c.type === item.type))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountInput("");
  }, []);

  // Quick Barcode / Code search add on Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      const trimmed = search.trim().toLowerCase();
      const exactMatch = items.find(
        (i) =>
          (i.barcode && i.barcode.toLowerCase() === trimmed) ||
          i.code.toLowerCase() === trimmed
      );

      if (exactMatch) {
        addToCart(exactMatch);
        toast.success(`Added ${exactMatch.name} to order`);
        setSearch("");
      }
    }
  };

  // =======================================================
  // PAYMENT PROCESSING & BILL GENERATION
  // =======================================================

  const openPaymentModal = () => {
    if (cart.length === 0) {
      toast.warning("Cart is empty. Add products to order first.");
      return;
    }
    // Pre-fill cash tendered with exact total
    setCashTenderedInput(total.toString());
    setIsPaymentModalOpen(true);
  };

  const cashTendered = useMemo(() => {
    return Number(cashTenderedInput) || 0;
  }, [cashTenderedInput]);

  const changeAmount = useMemo(() => {
    if (paymentMethod !== "CASH") return 0;
    return Math.max(0, cashTendered - total);
  }, [paymentMethod, cashTendered, total]);

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty.");
      return;
    }

    if (paymentMethod === "CASH" && cashTendered < total) {
      toast.error(
        `Cash tendered (${formatRs(cashTendered)}) is less than total amount (${formatRs(total)}).`
      );
      return;
    }

    try {
      setProcessingPayment(true);

      const payload = {
        customerId: selectedCustomerId,
        paymentMethod,
        discount: discountAmount,
        cashTendered: paymentMethod === "CASH" ? cashTendered : total,
        changeAmount: paymentMethod === "CASH" ? changeAmount : 0,
        paymentReference: paymentReference.trim(),
        paymentNote: paymentNote.trim(),
        items: cart.map((i) => ({
          id: i.id,
          type: i.type,
          quantity: i.quantity,
          unitPrice: i.price,
        })),
      };

      const res = await fetch("/api/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to complete sale.");
      }

      const selectedCustomer = customers.find(
        (c) => c.id === selectedCustomerId
      );

      const now = new Date();
      const invoiceNo =
        result.data?.invoiceNo ||
        result.data?.saleNumber ||
        `INV-${Date.now()}`;

      const completedBill: CompletedSaleBill = {
        saleId: result.data?.saleId || null,
        invoiceNo,
        date: now.toLocaleDateString("en-LK", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
        time: now.toLocaleTimeString("en-LK", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
        customerName: selectedCustomer ? selectedCustomer.name : "Walk-in Customer",
        customerPhone: selectedCustomer?.phone || undefined,
        paymentMethod,
        items: cart.map((i) => ({
          name: i.name,
          code: i.code,
          category: i.category,
          quantity: i.quantity,
          unit: i.unit,
          unitPrice: i.price,
          total: i.price * i.quantity,
        })),
        subtotal: Number(result.data?.subtotal ?? subtotal),
        tax: Number(result.data?.tax ?? taxTotal),
        discount: Number(result.data?.discount ?? discountAmount),
        total: Number(result.data?.total ?? total),
        cashTendered: paymentMethod === "CASH" ? cashTendered : total,
        changeAmount: paymentMethod === "CASH" ? changeAmount : 0,
        reference: paymentReference || undefined,
        note: paymentNote || undefined,
      };

      setLastCompletedBill(completedBill);
      setIsPaymentModalOpen(false);
      setIsBillModalOpen(true);

      toast.success("Payment Received & Bill Generated!", {
        description: `Invoice ${invoiceNo} • Total: ${formatRs(total)}`,
      });

      // Clear current cart and reload database stock
      clearCart();
      loadItems();
    } catch (err) {
      console.error("COMPLETE SALE ERROR:", err);
      const msg = err instanceof Error ? err.message : "Failed to complete sale.";
      toast.error(msg);
    } finally {
      setProcessingPayment(false);
    }
  };

  // =======================================================
  // PRINT BILL / RECEIPT FUNCTION
  // Supports Thermal (80mm) and Standard A4 layouts
  // =======================================================

  const printBill = useCallback(
    (format: "thermal" | "a4" = "thermal") => {
      const bill = lastCompletedBill;
      if (!bill) {
        toast.warning("No bill available to print.");
        return;
      }

      const printWindow = window.open("", "_blank", "width=600,height=800");
      if (!printWindow) {
        toast.error("Please allow popups in your browser to print the bill.");
        return;
      }

      const rowsHtml = bill.items
        .map(
          (item) => `
        <tr>
          <td style="padding: 4px 0; text-align: left; vertical-align: top;">
            <div style="font-weight: 700; font-size: ${format === "thermal" ? "11px" : "13px"};">${item.name}</div>
            <div style="font-size: ${format === "thermal" ? "9px" : "11px"}; color: #666;">${item.code} • ${item.category}</div>
          </td>
          <td style="padding: 4px 0; text-align: center; vertical-align: top; font-size: ${format === "thermal" ? "11px" : "13px"};">
            ${item.quantity} ${item.unit}
          </td>
          <td style="padding: 4px 0; text-align: right; vertical-align: top; font-size: ${format === "thermal" ? "11px" : "13px"};">
            ${formatRs(item.unitPrice)}
          </td>
          <td style="padding: 4px 0; text-align: right; vertical-align: top; font-weight: 700; font-size: ${format === "thermal" ? "11px" : "13px"};">
            ${formatRs(item.total)}
          </td>
        </tr>
      `
        )
        .join("");

      const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${bill.invoiceNo} - Pubudu POS Bill</title>
          <style>
            @page {
              size: ${format === "thermal" ? "80mm auto" : "A4 portrait"};
              margin: ${format === "thermal" ? "4mm" : "15mm"};
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #111;
              background: #fff;
              margin: 0;
              padding: ${format === "thermal" ? "4mm" : "10mm"};
              width: ${format === "thermal" ? "72mm" : "auto"};
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              margin-bottom: 12px;
            }
            .store-name {
              font-size: ${format === "thermal" ? "18px" : "26px"};
              font-weight: 900;
              letter-spacing: 0.5px;
              margin: 0;
            }
            .store-tagline {
              font-size: ${format === "thermal" ? "10px" : "13px"};
              color: #444;
              margin-top: 3px;
            }
            .store-meta {
              font-size: ${format === "thermal" ? "9px" : "11px"};
              color: #666;
              margin-top: 3px;
              line-height: 1.4;
            }
            .divider {
              border-top: 1px dashed #222;
              margin: 8px 0;
            }
            .solid-divider {
              border-top: 2px solid #222;
              margin: 8px 0;
            }
            .meta-grid {
              font-size: ${format === "thermal" ? "10px" : "12px"};
              line-height: 1.5;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            th {
              border-bottom: 1px solid #222;
              padding: 4px 0;
              font-size: ${format === "thermal" ? "10px" : "12px"};
              text-transform: uppercase;
            }
            .summary-table {
              width: 100%;
              margin-top: 6px;
              font-size: ${format === "thermal" ? "11px" : "13px"};
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              font-size: ${format === "thermal" ? "15px" : "18px"};
              font-weight: 900;
              border-top: 1px solid #222;
              border-bottom: 1px solid #222;
              margin-top: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 14px;
              font-size: ${format === "thermal" ? "9px" : "11px"};
              color: #555;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="store-name">PUBUDU CREATIVE HUB</h1>
            <div class="store-tagline">Printing • Photocopy • Stationary • Mobile Accessories</div>
            <div class="store-meta">
              No. 45, Main Street, Colombo, Sri Lanka<br />
              Tel: 077 123 4567 / 011 234 5678 • pubuduhub@gmail.com
            </div>
          </div>

          <div class="solid-divider"></div>

          <div class="meta-grid">
            <div class="meta-row">
              <span><strong>INVOICE NO:</strong> ${bill.invoiceNo}</span>
              <span>${bill.date}</span>
            </div>
            <div class="meta-row">
              <span><strong>CUSTOMER:</strong> ${bill.customerName}</span>
              <span>${bill.time}</span>
            </div>
            ${
              bill.customerPhone
                ? `<div class="meta-row"><span><strong>TEL:</strong> ${bill.customerPhone}</span></div>`
                : ""
            }
            <div class="meta-row">
              <span><strong>PAYMENT:</strong> ${bill.paymentMethod}</span>
              <span><strong>CASHIER:</strong> POS Terminal</span>
            </div>
          </div>

          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th style="text-align: left; width: 45%;">Item</th>
                <th style="text-align: center; width: 15%;">Qty</th>
                <th style="text-align: right; width: 20%;">Price</th>
                <th style="text-align: right; width: 20%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="divider"></div>

          <div class="summary-table">
            <div class="summary-row">
              <span>Subtotal</span>
              <span>${formatRs(bill.subtotal)}</span>
            </div>
            ${
              bill.tax > 0
                ? `<div class="summary-row"><span>Tax</span><span>${formatRs(bill.tax)}</span></div>`
                : ""
            }
            ${
              bill.discount > 0
                ? `<div class="summary-row" style="color: #c00;"><span>Discount</span><span>- ${formatRs(bill.discount)}</span></div>`
                : ""
            }
            <div class="total-row">
              <span>NET TOTAL</span>
              <span>${formatRs(bill.total)}</span>
            </div>
            ${
              bill.paymentMethod === "CASH"
                ? `
                <div class="summary-row" style="margin-top: 4px;">
                  <span>Cash Tendered</span>
                  <span>${formatRs(bill.cashTendered)}</span>
                </div>
                <div class="summary-row">
                  <span><strong>Change Given</strong></span>
                  <span><strong>${formatRs(bill.changeAmount)}</strong></span>
                </div>
              `
                : ""
            }
          </div>

          <div class="divider"></div>

          <div class="footer">
            <strong>Thank you for choosing Pubudu Creative Hub!</strong><br />
            Please inspect items before leaving the counter.<br />
            *** Have a wonderful day! ***
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 250);
            };
          </script>
        </body>
      </html>
    `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    },
    [lastCompletedBill]
  );

  // =======================================================
  // QUICK ADD CUSTOMER
  // =======================================================

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      toast.error("Customer name is required.");
      return;
    }

    try {
      setSavingCustomer(true);
      const res = await fetch("/api/pos/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustName.trim(),
          phone: newCustPhone.trim() || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to create customer.");
      }

      toast.success(`Customer ${result.data.name} added!`);
      await loadCustomers();
      setSelectedCustomerId(result.data.id);
      setIsNewCustomerModalOpen(false);
      setNewCustName("");
      setNewCustPhone("");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to add customer.";
      toast.error(msg);
    } finally {
      setSavingCustomer(false);
    }
  };

  // =======================================================
  // UI RENDER
  // =======================================================

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 font-sans text-slate-800 antialiased">
      {/* ================================================= */}
      {/* 1. TOP NAVIGATION / HEADER */}
      {/* ================================================= */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:px-6">
        {/* Left: Brand & POS Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-slate-900">
                Pubudu Creative Hub
              </h1>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                POS
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              Sri Lankan Currency (Rs.) • Fast Billing Terminal
            </p>
          </div>
        </div>

        {/* Center: Search & Barcode Input */}
        <div className="mx-4 max-w-xl flex-1">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search product name, item code (PC-001) or press Enter to add barcode..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-xs font-medium text-slate-900 transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2.5">
          {lastCompletedBill && (
            <button
              type="button"
              onClick={() => setIsBillModalOpen(true)}
              className="flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
              title="View or print the last completed bill"
            >
              <Receipt className="h-4 w-4" />
              <span className="hidden md:inline">Last Bill ({lastCompletedBill.invoiceNo})</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadItems}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
            title="Refresh Catalog"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin text-emerald-600" : ""}`}
            />
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
        </div>
      </header>

      {/* ================================================= */}
      {/* 2. MAIN CONTENT BODY */}
      {/* ================================================= */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ================================================= */}
        {/* LEFT COLUMN: CATEGORIES RESOURCE SELECTOR */}
        {/* ================================================= */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
          <div className="border-b border-slate-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Resource Categories
            </p>
            <h2 className="mt-0.5 text-xs font-bold text-slate-800">
              Pubudu Creative Services
            </h2>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
            {/* All Items Button */}
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className={`group flex w-full items-center justify-between rounded-xl p-3 text-left transition ${
                selectedCategory === "All"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    selectedCategory === "All"
                      ? "bg-white/20 text-white"
                      : "bg-white text-slate-700 shadow-sm"
                  }`}
                >
                  <Layers className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">All Resources</p>
                  <p
                    className={`truncate text-[10px] ${
                      selectedCategory === "All"
                        ? "text-slate-300"
                        : "text-slate-400"
                    }`}
                  >
                    Entire Catalog
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  selectedCategory === "All"
                    ? "bg-white/20 text-white"
                    : "bg-white text-slate-700 shadow-sm"
                }`}
              >
                {items.length}
              </span>
            </button>

            {/* The 7 Categories */}
            {categoryList.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`group flex w-full items-center justify-between rounded-xl p-3 text-left transition ${
                    isSelected
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/15"
                      : "border border-slate-100 bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : `${cat.colorScheme.bg} ${cat.colorScheme.text}`
                      }`}
                    >
                      {renderCategoryIcon(cat.name, "h-4 w-4")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{cat.name}</p>
                      <p
                        className={`truncate text-[10px] ${
                          isSelected ? "text-emerald-100" : "text-slate-400"
                        }`}
                      >
                        {cat.description}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : `${cat.colorScheme.badgeBg}`
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 p-3 text-center">
            <p className="text-[10px] font-medium text-slate-400">
              Sri Lankan POS Currency • LKR (Rs.)
            </p>
          </div>
        </aside>

        {/* ================================================= */}
        {/* CENTER COLUMN: PRODUCT CATALOG */}
        {/* ================================================= */}
        <section className="flex flex-1 flex-col min-w-0 overflow-hidden bg-slate-50/50">
          {/* Catalog Header Bar */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/70 px-4 py-3 backdrop-blur-sm lg:px-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                {renderCategoryIcon(selectedCategory, "h-4 w-4")}
              </span>
              <span className="text-sm font-black text-slate-800">
                {selectedCategory === "All"
                  ? "All Products & Services"
                  : selectedCategory}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {filteredItems.length} items available
              </span>
            </div>
            {search && (
              <p className="text-xs text-slate-500">
                Filtering by &quot;{search}&quot;
              </p>
            )}
          </div>

          {/* Product Grid Area */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {loading ? (
              <div className="flex h-96 flex-col items-center justify-center text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="mt-3 text-xs font-bold text-slate-600">
                  Loading POS items from database...
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex h-96 flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Search className="h-8 w-8" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-800">
                  No items found
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-400">
                  Try another keyword, or switch to a different category above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredItems.map((item) => {
                  const inCartQty = cartQuantityMap.get(item.id) || 0;
                  const isOutOfStock =
                    item.type === "PRODUCT" &&
                    item.stock !== null &&
                    item.stock <= 0;
                  const isLowStock =
                    item.type === "PRODUCT" &&
                    item.stock !== null &&
                    item.stock > 0 &&
                    item.minimumStock !== null &&
                    item.stock <= item.minimumStock;

                  const catStyle =
                    CATEGORY_STYLES[item.category] ||
                    CATEGORY_STYLES["Stationary"];

                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      onClick={() => !isOutOfStock && addToCart(item)}
                      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-3.5 shadow-sm transition-all duration-150 ${
                        isOutOfStock
                          ? "cursor-not-allowed opacity-60 border-slate-200"
                          : "cursor-pointer border-slate-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md"
                      } ${inCartQty > 0 ? "ring-2 ring-emerald-500/80 border-emerald-500" : ""}`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold ${catStyle.bg} ${catStyle.text}`}
                        >
                          {renderCategoryIcon(item.category, "h-3 w-3")}
                          {item.category}
                        </span>

                        {inCartQty > 0 && (
                          <span className="flex h-5 items-center justify-center rounded-full bg-emerald-600 px-2 text-[10px] font-black text-white shadow-sm">
                            {inCartQty} in cart
                          </span>
                        )}
                      </div>

                      {/* Product Name & Code */}
                      <div className="mt-3">
                        <h4 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 group-hover:text-emerald-700">
                          {item.name}
                        </h4>
                        <div className="mt-1 flex items-center gap-2 text-[10px] font-medium text-slate-400">
                          <span>{item.code}</span>
                          {item.unit && <span>• {item.unit}</span>}
                        </div>
                      </div>

                      {/* Stock Info */}
                      {item.type === "PRODUCT" && item.stock !== null && (
                        <div className="mt-2 text-[10px]">
                          {isOutOfStock ? (
                            <span className="font-bold text-rose-600">
                              Out of stock
                            </span>
                          ) : isLowStock ? (
                            <span className="font-medium text-amber-600">
                              Low stock: {item.stock} {item.unit}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Stock: {item.stock} {item.unit}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Price and Add Button */}
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                        <div>
                          <p className="text-xs font-black text-slate-900">
                            {formatRs(item.price)}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            per {item.unit}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                          className={`flex h-8 w-8 items-center justify-center rounded-xl shadow-sm transition ${
                            isOutOfStock
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95"
                          }`}
                          title="Add to order"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ================================================= */}
        {/* RIGHT COLUMN: CURRENT ORDER & BILL SUMMARY */}
        {/* ================================================= */}
        <aside className="hidden lg:flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white sm:w-96 lg:w-[410px]">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-slate-800" />
              <h2 className="text-sm font-black text-slate-900">Current Order</h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                {totalItemsCount} items
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700"
                title="Clear current cart"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Customer Selection Bar */}
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50/60 p-3">
            <div className="relative flex-1">
              <UserRound className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedCustomerId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCustomerId(val ? Number(val) : null);
                }}
                className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-8 pr-7 text-xs font-semibold text-slate-700 transition focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsNewCustomerModalOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              title="Add New Customer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                  <ShoppingCart className="h-7 w-7" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-700">
                  Cart is empty
                </h3>
                <p className="mt-1 text-xs text-slate-400 max-w-[200px]">
                  Select products from any category to build the customer&apos;s bill.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={`${item.type}-${item.id}`} className="p-3.5 hover:bg-slate-50/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {item.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{item.category}</span>
                        <span>•</span>
                        <span>{formatRs(item.price)} each</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      className="text-slate-300 transition hover:text-rose-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Quantity Stepper & Line Total */}
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => decreaseQuantity(item)}
                        className="flex h-7 w-7 items-center justify-center text-slate-600 transition hover:bg-slate-100"
                      >
                        <Minus className="h-3 w-3" />
                      </button>

                      <input
                        type="number"
                        min="1"
                        max={item.stock ?? 9999}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          updateQuantity(item, isNaN(val) ? 1 : val);
                        }}
                        className="h-7 w-12 border-x border-slate-200 text-center text-xs font-black text-slate-800 focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => increaseQuantity(item)}
                        className="flex h-7 w-7 items-center justify-center text-slate-600 transition hover:bg-slate-100"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <p className="text-xs font-black text-slate-900">
                      {formatRs(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ================================================= */}
          {/* CART BILL TOTALS & CHECKOUT BUTTON */}
          {/* ================================================= */}
          <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 p-4">
            {/* Discount Input */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">
                Discount (Rs.)
              </span>
              <div className="relative w-32">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  max={subtotal + taxTotal}
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder="0.00"
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2 text-right text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Price Calculations */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">
                  {formatRs(subtotal)}
                </span>
              </div>

              {taxTotal > 0 && (
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span className="font-semibold text-slate-800">
                    {formatRs(taxTotal)}
                  </span>
                </div>
              )}

              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Discount</span>
                  <span>- {formatRs(discountAmount)}</span>
                </div>
              )}

              <div className="border-t border-dashed border-slate-200 pt-2" />

              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-900">
                  Total Payable
                </span>
                <span className="text-xl font-black text-slate-900">
                  {formatRs(total)}
                </span>
              </div>
            </div>

            {/* Complete Payment Button */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={openPaymentModal}
              className="mt-4 flex h-12 w-full items-center justify-between rounded-xl bg-emerald-600 px-4 text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-wide">
                  Charge & Generate Bill
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-black">
                <span>{formatRs(total)}</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        </aside>
      </div>

      {/* ================================================= */}
      {/* 3. PAYMENT MODAL (FULLY RESPONSIVE WITH FIXED FOOTER) */}
      {/* ================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative flex flex-col w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Modal Fixed Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Process Payment & Bill
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select payment method and confirm tender amount
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Total Display */}
              <div className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white shadow-inner">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Amount Due (LKR)
                    </p>
                    <p className="mt-0.5 text-2xl sm:text-3xl font-black tracking-tight text-white">
                      {formatRs(total)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                      {totalItemsCount} items
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-slate-300 border-t border-white/10 pt-1.5 truncate">
                  Customer:{" "}
                  {customers.find((c) => c.id === selectedCustomerId)?.name ||
                    "Walk-in Customer"}
                </p>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "CASH", label: "Cash", icon: Banknote },
                    { id: "CARD", label: "Card", icon: CreditCard },
                    { id: "ONLINE", label: "Online QR", icon: QrCode },
                    { id: "BANK_TRANSFER", label: "Bank Transfer", icon: FileText },
                    { id: "CREDIT", label: "Credit", icon: Receipt },
                  ].map((pm) => {
                    const Icon = pm.icon;
                    const isSelected = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id as PaymentMethodType)}
                        className={`flex items-center gap-2 rounded-xl border p-2 text-xs font-bold transition ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Tendered & Change Calculation */}
              {paymentMethod === "CASH" ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Cash Received (Rs.)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Amount handed by customer
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      Rs.
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={cashTenderedInput}
                      onChange={(e) => setCashTenderedInput(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-base font-black text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Quick Cash Shortcuts */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCashTenderedInput(total.toString())}
                      className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100"
                    >
                      Exact (Rs. {total})
                    </button>
                    {[100, 500, 1000, 2000, 5000].map((amt) => {
                      if (amt >= total || total > amt) {
                        return (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setCashTenderedInput(amt.toString())}
                            className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100"
                          >
                            Rs. {amt}
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {/* Change or Due Display */}
                  <div className="border-t border-slate-200 pt-2.5">
                    {cashTendered >= total ? (
                      <div className="flex items-center justify-between rounded-xl bg-emerald-100/70 px-3 py-2 text-emerald-900">
                        <span className="text-xs font-bold">
                          Change to Return:
                        </span>
                        <span className="text-base font-black">
                          {formatRs(changeAmount)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-xl bg-amber-100/70 px-3 py-2 text-amber-900">
                        <span className="text-xs font-bold">
                          Remaining Due:
                        </span>
                        <span className="text-sm font-black">
                          {formatRs(total - cashTendered)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    Transaction Reference / ID
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. Card approval code or Bank slip no"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Optional Order / Payment Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Bill Note (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. WhatsApp document sent, Urgent job"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Fixed Footer - Always Visible */}
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-5 py-3.5 flex items-center gap-3 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                disabled={processingPayment}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={
                  processingPayment ||
                  (paymentMethod === "CASH" && cashTendered < total)
                }
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700 active:scale-[0.99] disabled:bg-slate-300 disabled:shadow-none transition"
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Sale...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Generate Bill</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* 4. BILL / RECEIPT GENERATED MODAL (RESPONSIVE) */}
      {/* ================================================= */}
      {isBillModalOpen && lastCompletedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative flex flex-col w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header / Success Indicator */}
            <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-black uppercase tracking-wide">
                  Bill Generated Successfully
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsBillModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Bill Receipt Preview Scrollable Container */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 sm:p-5 font-mono text-xs text-slate-800">
                {/* Store Header */}
                <div className="text-center">
                  <h4 className="text-base font-black tracking-wider text-slate-900">
                    PUBUDU CREATIVE HUB
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Printing • Designing • Stationery • Mobile Accessories
                  </p>
                  <p className="text-[10px] text-slate-400">
                    No. 45, Main Street, Colombo, Sri Lanka
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Tel: +94 77 123 4567 | WhatsApp: 071 987 6543
                  </p>
                </div>

                <div className="my-3 border-t border-dashed border-slate-300" />

                {/* Bill Meta */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice No:</span>
                    <span className="font-bold">{lastCompletedBill.invoiceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date & Time:</span>
                    <span>
                      {lastCompletedBill.date} {lastCompletedBill.time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-bold">{lastCompletedBill.customerName}</span>
                  </div>
                  {lastCompletedBill.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Phone:</span>
                      <span>{lastCompletedBill.customerPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment:</span>
                    <span className="font-bold">{lastCompletedBill.paymentMethod}</span>
                  </div>
                </div>

                <div className="my-3 border-t border-dashed border-slate-300" />

                {/* Items Table */}
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500">
                      <th className="py-1 text-left">Item</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Price</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lastCompletedBill.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 pr-2">
                          <div className="font-bold text-slate-900">{it.name}</div>
                          <div className="text-[9px] text-slate-400">
                            {it.code}
                          </div>
                        </td>
                        <td className="py-1.5 text-center">{it.quantity}</td>
                        <td className="py-1.5 text-right">{formatRs(it.unitPrice)}</td>
                        <td className="py-1.5 text-right font-bold">
                          {formatRs(it.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="my-3 border-t border-dashed border-slate-300" />

                {/* Totals */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatRs(lastCompletedBill.subtotal)}</span>
                  </div>
                  {lastCompletedBill.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount</span>
                      <span>- {formatRs(lastCompletedBill.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-black text-slate-900">
                    <span>NET TOTAL</span>
                    <span>{formatRs(lastCompletedBill.total)}</span>
                  </div>
                  {lastCompletedBill.paymentMethod === "CASH" && (
                    <>
                      <div className="flex justify-between pt-1 text-slate-600">
                        <span>Cash Tendered</span>
                        <span>{formatRs(lastCompletedBill.cashTendered)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-700">
                        <span>Change Returned</span>
                        <span>{formatRs(lastCompletedBill.changeAmount)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="my-3 border-t border-dashed border-slate-300" />

                {/* Bill Footer Note */}
                <div className="text-center text-[10px] text-slate-500">
                  <p>*** Thank You for Your Business! ***</p>
                  <p>Pubudu Creative Hub • Colombo, Sri Lanka</p>
                </div>
              </div>
            </div>

            {/* Print & Action Buttons Fixed Footer */}
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-5 py-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => printBill("thermal")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-100"
              >
                <Printer className="h-4 w-4 text-emerald-600" />
                <span>Thermal (80mm)</span>
              </button>

              <button
                type="button"
                onClick={() => printBill("a4")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-100"
              >
                <FileText className="h-4 w-4 text-blue-600" />
                <span>A4 Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsBillModalOpen(false);
                  clearCart();
                }}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                <span>New Sale</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* 5. QUICK ADD CUSTOMER MODAL */}
      {/* ================================================= */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleCreateCustomer}
            className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">
                Quick Add Customer
              </h3>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Kasun Fernando"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 0771234567"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCustomer}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingCustomer ? "Saving..." : "Save Customer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
