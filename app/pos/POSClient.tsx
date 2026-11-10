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
  Star,
  Smartphone,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import React from "react";

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
  categoryId: number;
  categoryType: "PRODUCT" | "SERVICE";

  warrantyEnabled: boolean;

  brand: string;
  barcode: string | null;
  stock: number | null;
  minimumStock: number | null;
  tax: {
    id: number;
    name: string;
    rate: number;
  } | null;
  warrantyMonths?: number;
};

type CartItem = POSItem & {
  quantity: number;
  originalPrice?: number;
  warrantyMonths?: number;
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
  key: string;
  type: "PRODUCT" | "SERVICE";
  id: number;
};

type POSCategory = {
  id: number;
  name: string;
  description: string | null;
  type: "PRODUCT" | "SERVICE";
  count: number;
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
  warranties?: Array<{
    warrantyCode: string;
    productName: string;
    durationMonths: number;
    expiryDate: string;
  }>;
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
// CATEGORY PRESENTATION (NO CATEGORY DATA IS HARDCODED)
// =========================================================

const DEFAULT_CATEGORY_STYLE = {
  bg: "bg-slate-50",
  text: "text-slate-700",
  border: "border-slate-200",
  badgeBg: "bg-slate-100 text-slate-700",
  activeBg: "bg-slate-900",
  activeText: "text-white",
  activeRing: "ring-slate-900",
};

function renderCategoryIcon(
  type: "PRODUCT" | "SERVICE",
  className = "h-4 w-4"
) {
  return type === "SERVICE" ? (
    <Printer className={className} />
  ) : (
    <Layers className={className} />
  );
}

// =========================================================
// MAIN POS CLIENT COMPONENT
// =========================================================

export default function POSClient() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Data states
  const [items, setItems] = useState<POSItem[]>([]);
  const [productCategories, setProductCategories] = useState<POSCategory[]>([]);
  const [serviceCategories, setServiceCategories] = useState<POSCategory[]>([]);
  const [customers, setCustomers] = useState<POSCustomer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Filter & Search states
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Favourite Resources - Browser Local Storage
  const [favouriteKeys, setFavouriteKeys] = useState<string[]>([]);
  const [favouritesLoaded, setFavouritesLoaded] = useState(false);

  const FAVOURITES_STORAGE_KEY = "pubudu-pos-favourite-resources";

  // Load favourites from Local Storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAVOURITES_STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (
          Array.isArray(parsed) &&
          parsed.every((key) => typeof key === "string")
        ) {
          setFavouriteKeys(parsed);
        }
      }
    } catch (error) {
      console.error("LOAD FAVOURITES ERROR:", error);
    } finally {
      setFavouritesLoaded(true);
    }
  }, []);

  // Save favourites to Local Storage
  useEffect(() => {
    if (!favouritesLoaded) return;

    try {
      localStorage.setItem(
        FAVOURITES_STORAGE_KEY,
        JSON.stringify(favouriteKeys)
      );
    } catch (error) {
      console.error("SAVE FAVOURITES ERROR:", error);
      toast.error("Unable to save favourite resources.");
    }
  }, [favouriteKeys, favouritesLoaded]);

  // Toggle favourite status
  const toggleFavourite = useCallback((item: POSItem) => {
    const key = `${item.type}-${item.id}`;

    setFavouriteKeys((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key]
    );
  }, []);

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

  // Dedicated Price Edit Modal State for any product / service
  const [priceEditModalItem, setPriceEditModalItem] = useState<{
    item: POSItem | CartItem;
    initialPrice: number;
    originalPrice: number;
    inCart: boolean;
  } | null>(null);
  const [priceModalInputValue, setPriceModalInputValue] = useState<string>("");

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
      setProductCategories(result.categories?.products || []);
      setServiceCategories(result.categories?.services || []);
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
            setProductCategories(itemsJson.categories?.products || []);
            setServiceCategories(itemsJson.categories?.services || []);
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
  // DATABASE-DRIVEN PRODUCT & SERVICE CATEGORIES
  // =======================================================

  const categoryList = useMemo<CategoryInfo[]>(() => {
    const categories = [
      ...productCategories,
      ...serviceCategories,
    ];

    return categories.map((category) => ({
      name: category.name,
      count: Number(category.count || 0),
      iconName: category.type === "SERVICE" ? "Printer" : "Layers",
      colorScheme: DEFAULT_CATEGORY_STYLE,
      description:
        category.description ||
        (category.type === "SERVICE" ? "Service category" : "Product category"),
      key: `${category.type}-${category.id}`,
      type: category.type,
      id: category.id,
    }));
  }, [productCategories, serviceCategories]);

  useEffect(() => {
    if (
      selectedCategory !== "All" &&
      !categoryList.some((category) => category.key === selectedCategory)
    ) {
      setSelectedCategory("All");
    }
  }, [categoryList, selectedCategory]);

  // =======================================================
  // FILTERED PRODUCTS
  // =======================================================

  const filteredItems = useMemo(() => {
    let result = items;

    if (selectedCategory !== "All") {
      const [categoryType, categoryId] = selectedCategory.split("-");
      result = result.filter(
        (item) =>
          item.categoryType === categoryType &&
          item.categoryId === Number(categoryId)
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

    return [...result].sort((a, b) => {
      const aKey = `${a.type}-${a.id}`;
      const bKey = `${b.type}-${b.id}`;

      const aFavourite = favouriteKeys.includes(aKey);
      const bFavourite = favouriteKeys.includes(bKey);

      if (aFavourite && !bFavourite) return -1;
      if (!aFavourite && bFavourite) return 1;

      return 0;
    });
  }, [items, selectedCategory, search, favouriteKeys]);

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

      return [
        ...curr,
        {
          ...item,
          quantity: 1,
          originalPrice: item.price,
          warrantyMonths: item.warrantyMonths ?? 0,
        },
      ];
    });
  }, []);

  // Assign shortcuts 1-10 to the first 10 favourite items.
  // The number 0 on the keyboard represents shortcut number 10.
  const shortcutNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    const favouriteItems = items
      .filter((item) => favouriteKeys.includes(`${item.type}-${item.id}`))
      .slice(0, 10);

    favouriteItems.forEach((item, index) => {
      map.set(`${item.type}-${item.id}`, index + 1);
    });

    return map;
  }, [items, favouriteKeys]);

  // Keyboard shortcuts: 1-9 add favourites 1-9; 0 adds favourite 10.
  useEffect(() => {
    const handleFavouriteShortcut = (event: KeyboardEvent) => {
      if (
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.repeat ||
        isPaymentModalOpen ||
        isBillModalOpen ||
        isNewCustomerModalOpen ||
        priceEditModalItem
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']"))
      ) {
        return;
      }

      if (!/^[0-9]$/.test(event.key)) return;

      const shortcutNumber = event.key === "0" ? 10 : Number(event.key);
      const shortcutItem = items
        .filter((item) => favouriteKeys.includes(`${item.type}-${item.id}`))
        .slice(0, 10)[shortcutNumber - 1];

      if (!shortcutItem) return;

      event.preventDefault();
      addToCart(shortcutItem);
    };

    window.addEventListener("keydown", handleFavouriteShortcut);
    return () => window.removeEventListener("keydown", handleFavouriteShortcut);
  }, [
    items,
    favouriteKeys,
    addToCart,
    isPaymentModalOpen,
    isBillModalOpen,
    isNewCustomerModalOpen,
    priceEditModalItem,
  ]);

  const updateItemWarranty = useCallback((item: CartItem, months: number) => {
    setCart((curr) =>
      curr.map((c) =>
        c.id === item.id && c.type === item.type
          ? { ...c, warrantyMonths: months }
          : c
      )
    );
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

  const handleStartEditPrice = useCallback((item: CartItem) => {
    setEditingPriceKey(`${item.type}-${item.id}`);
    setEditPriceValue(item.price.toString());
  }, []);

  const handleSavePrice = useCallback(
    (item: CartItem) => {
      const newPrice = parseFloat(editPriceValue);
      if (!isNaN(newPrice) && newPrice >= 0) {
        setCart((curr) =>
          curr.map((c) =>
            c.id === item.id && c.type === item.type
              ? { ...c, price: newPrice, originalPrice: c.originalPrice ?? c.price }
              : c
          )
        );
        toast.success(`Updated ${item.name} unit price to ${formatRs(newPrice)}`);
      } else {
        toast.error("Please enter a valid price.");
      }
      setEditingPriceKey(null);
    },
    [editPriceValue]
  );

  const openPriceEditModal = useCallback(
    (item: POSItem | CartItem) => {
      const existingInCart = cart.find(
        (c) => c.id === item.id && c.type === item.type
      );
      const currentPrice = existingInCart ? existingInCart.price : item.price;
      const original =
        existingInCart &&
          "originalPrice" in existingInCart &&
          typeof existingInCart.originalPrice === "number"
          ? existingInCart.originalPrice
          : item.price;

      setPriceEditModalItem({
        item,
        initialPrice: currentPrice,
        originalPrice: original,
        inCart: !!existingInCart,
      });
      setPriceModalInputValue(currentPrice.toString());
    },
    [cart]
  );

  const handleApplyModalPrice = useCallback(() => {
    if (!priceEditModalItem) return;

    const newPrice = parseFloat(priceModalInputValue);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Please enter a valid price (greater than or equal to Rs. 0).");
      return;
    }

    const { item, originalPrice, inCart } = priceEditModalItem;

    if (inCart) {
      setCart((curr) =>
        curr.map((c) =>
          c.id === item.id && c.type === item.type
            ? { ...c, price: newPrice, originalPrice: c.originalPrice ?? originalPrice }
            : c
        )
      );
      toast.success(`Unit price for "${item.name}" updated to ${formatRs(newPrice)}`);
    } else {
      if (item.type === "PRODUCT" && item.stock !== null && item.stock <= 0) {
        toast.error(`${item.name} is currently out of stock.`);
        return;
      }
      setCart((curr) => [
        ...curr,
        {
          ...item,
          quantity: 1,
          price: newPrice,
          originalPrice: item.price,
        },
      ]);
      toast.success(`Added "${item.name}" at custom price ${formatRs(newPrice)}`);
    }

    setPriceEditModalItem(null);
  }, [priceEditModalItem, priceModalInputValue]);

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
    setIsMobileCartOpen(false);
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
          warrantyMonths: i.warrantyMonths ?? 0,
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
        warranties: Array.isArray(result.warranties)
          ? result.warranties
          : Array.isArray(result.data?.warranties)
            ? result.data.warranties
            : [],
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
  // KEYBOARD ENTER - FAST BILLING WORKFLOW
  // =======================================================

  const keyboardPaymentLockRef = useRef(false);

  useEffect(() => {
    const handleEnterKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat) return;

      // Do not interfere with other open modals
      if (isNewCustomerModalOpen || priceEditModalItem) return;

      // STEP 2: Payment modal -> Confirm payment and generate bill
      if (isPaymentModalOpen) {
        event.preventDefault();

        if (processingPayment || keyboardPaymentLockRef.current) return;

        keyboardPaymentLockRef.current = true;

        void handleCompleteSale().finally(() => {
          keyboardPaymentLockRef.current = false;
        });

        return;
      }

      // STEP 3: Bill modal -> Start a new sale
      if (isBillModalOpen) {
        event.preventDefault();

        setIsBillModalOpen(false);
        clearCart();
        setSearch("");

        // Remove focus from the search input or bill buttons
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        return;
      }

      // Do not trigger checkout while typing in an input
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']")
        )
      ) {
        return;
      }

      // STEP 1: Cart has items -> Open payment modal
      if (cart.length > 0) {
        event.preventDefault();
        openPaymentModal();
      }
    };

    window.addEventListener("keydown", handleEnterKey);

    return () => {
      window.removeEventListener("keydown", handleEnterKey);
    };
  }, [
    cart.length,
    isPaymentModalOpen,
    isBillModalOpen,
    isNewCustomerModalOpen,
    priceEditModalItem,
    processingPayment,
    handleCompleteSale,
    clearCart,
  ]);


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
            ${bill.customerPhone
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
            ${bill.tax > 0
          ? `<div class="summary-row"><span>Tax</span><span>${formatRs(bill.tax)}</span></div>`
          : ""
        }
            ${bill.discount > 0
          ? `<div class="summary-row" style="color: #c00;"><span>Discount</span><span>- ${formatRs(bill.discount)}</span></div>`
          : ""
        }
            <div class="total-row">
              <span>NET TOTAL</span>
              <span>${formatRs(bill.total)}</span>
            </div>
            ${bill.paymentMethod === "CASH"
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

          ${bill.warranties && bill.warranties.length > 0
          ? `
              <div style="margin: 8px 0; padding: 6px 8px; border: 1px dashed #059669; background: #ecfdf5; border-radius: 4px; font-size: 10px;">
                <div style="font-weight: bold; color: #065f46; text-transform: uppercase; margin-bottom: 4px; font-size: 9px; letter-spacing: 0.5px;">Official Warranty Issued</div>
                ${bill.warranties
            .map(
              (w) => `
                  <div style="margin-bottom: 4px; border-bottom: 1px dotted #a7f3d0; padding-bottom: 3px;">
                    <div><strong>Code:</strong> ${w.warrantyCode} (${w.durationMonths} Months)</div>
                    <div><strong>Item:</strong> ${w.productName}</div>
                    <div><strong>Expires:</strong> ${w.expiryDate}</div>
                  </div>
                `
            )
            .join("")}
              </div>
              <div class="divider"></div>
            `
          : ""
        }

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
      {/* 1. TOP NAVIGATION / HEADER (RESPONSIVE) */}
      {/* ================================================= */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-4 lg:px-6 shadow-sm gap-2">
        {/* Left: Brand & POS Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
            <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="hidden xs:block">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-base font-black tracking-tight text-slate-900">
                Pubudu Hub
              </h1>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold text-emerald-800">
                POS
              </span>
            </div>
            <p className="hidden md:block text-[11px] font-medium text-slate-500">
              Sri Lankan Currency (Rs.) • Fast Billing Terminal
            </p>
          </div>
        </div>

        {/* Center: Search & Barcode Input */}
        <div className="mx-1 sm:mx-4 max-w-xl flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search product, barcode or code..."
              className="h-9 sm:h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 sm:pl-10 pr-8 text-xs font-medium text-slate-900 transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {lastCompletedBill && (
            <button
              type="button"
              onClick={() => setIsBillModalOpen(true)}
              className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 sm:px-3.5 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
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
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
            title="Refresh Catalog"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin text-emerald-600" : ""}`}
            />
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3 sm:px-4 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
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
              className={`group flex w-full items-center justify-between rounded-xl p-3 text-left transition ${selectedCategory === "All"
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selectedCategory === "All"
                    ? "bg-white/20 text-white"
                    : "bg-white text-slate-700 shadow-sm"
                    }`}
                >
                  <Layers className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">All Resources</p>
                  <p
                    className={`truncate text-[10px] ${selectedCategory === "All"
                      ? "text-slate-300"
                      : "text-slate-400"
                      }`}
                  >
                    Entire Catalog
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${selectedCategory === "All"
                  ? "bg-white/20 text-white"
                  : "bg-white text-slate-700 shadow-sm"
                  }`}
              >
                {items.length}
              </span>
            </button>

            {/* The 7 Categories */}
            {categoryList.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`group flex w-full items-center justify-between rounded-xl p-3 text-left transition ${isSelected
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/15"
                    : "border border-slate-100 bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected
                        ? "bg-white/20 text-white"
                        : `${cat.colorScheme.bg} ${cat.colorScheme.text}`
                        }`}
                    >
                      {renderCategoryIcon(cat.type, "h-4 w-4")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{cat.name}</p>
                      <p
                        className={`truncate text-[10px] ${isSelected ? "text-emerald-100" : "text-slate-400"
                          }`}
                      >
                        {cat.description}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isSelected
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
        <section className="flex flex-1 flex-col min-w-0 overflow-hidden bg-slate-50/50 pb-24 lg:pb-0">
          {/* Catalog Header Bar */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/70 px-4 py-3 backdrop-blur-sm lg:px-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                {selectedCategory === "All"
                  ? <Layers className="h-4 w-4" />
                  : renderCategoryIcon(
                    categoryList.find((cat) => cat.key === selectedCategory)?.type || "PRODUCT",
                    "h-4 w-4"
                  )}
              </span>
              <span className="text-sm font-black text-slate-800">
                {selectedCategory === "All"
                  ? "All Products & Services"
                  : categoryList.find((cat) => cat.key === selectedCategory)?.name || "Category"}
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

          {/* Mobile Horizontal Category Pills (Visible on Mobile & Tablet) */}
          <div className="flex md:hidden items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${selectedCategory === "All"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
            >
              <Layers className="h-3 w-3" />
              <span>All ({items.length})</span>
            </button>
            {categoryList.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${isSelected
                    ? "bg-emerald-600 text-white shadow-sm"
                    : `${cat.colorScheme.bg} ${cat.colorScheme.text} border border-slate-200 hover:opacity-90`
                    }`}
                >
                  {renderCategoryIcon(cat.type, "h-3 w-3")}
                  <span>{cat.name}</span>
                  <span className="opacity-75">({cat.count})</span>
                </button>
              );
            })}
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
                {filteredItems.map((item, index) => {
                  const itemKey = `${item.type}-${item.id}`;
                  const isFavourite = favouriteKeys.includes(itemKey);
                  const shortcutNumber = shortcutNumberMap.get(itemKey);

                  const previousWasFavourite =
                    index > 0 &&
                    favouriteKeys.includes(
                      `${filteredItems[index - 1].type}-${filteredItems[index - 1].id}`
                    );
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

                  const catStyle = DEFAULT_CATEGORY_STYLE;


                  return (
                    <React.Fragment key={`${item.type}-${item.id}`}>
                      {/* Favourite Section Heading */}
                      {index === 0 && isFavourite && (
                        <div className="col-span-full flex items-center gap-2 py-1">
                          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                          <h3 className="text-sm font-bold text-slate-700">
                            Favourite Resources
                          </h3>
                          <span className="text-xs text-slate-400">
                            ({favouriteKeys.filter((key) =>
                              filteredItems.some(
                                (i) => `${i.type}-${i.id}` === key
                              )
                            ).length})
                          </span>
                          <span className="ml-auto text-[10px] font-medium text-emerald-700">
                            Shortcuts: 1–9, 0
                          </span>
                        </div>
                      )}

                      {/* All Products Section Heading */}
                      {!isFavourite && previousWasFavourite && (
                        <>
                          <div className="col-span-full my-2 border-t border-slate-300" />

                          <div className="col-span-full py-1">
                            <h3 className="text-sm font-bold text-slate-600">
                              All Products & Services
                            </h3>
                          </div>
                        </>
                      )}

                      {/* Product Card */}
                      <div
                        onClick={() => !isOutOfStock && addToCart(item)}
                        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-3.5 shadow-sm transition-all duration-150 ${isOutOfStock
                          ? "cursor-not-allowed opacity-60 border-slate-200"
                          : "cursor-pointer border-slate-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md"
                          } ${inCartQty > 0
                            ? "ring-2 ring-emerald-500/80 border-emerald-500"
                            : ""
                          }`}
                      >
                        {/* Top Badges */}
                        <div className="flex w-full min-w-0 items-center justify-between gap-2">

                          {/* Category Badge */}
                          <span
                            className={`inline-flex min-w-0 max-w-[70%] items-center gap-1 rounded-md px-2 py-1 text-[9px] font-bold ${catStyle.bg} ${catStyle.text}`}
                          >
                            <span className="shrink-0">
                              {renderCategoryIcon(item.categoryType, "h-3 w-3")}
                            </span>
                            <span className="truncate">{item.category}</span>
                          </span>

                          {/* Favourite Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavourite(item);
                            }}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${isFavourite
                              ? "border-amber-300 bg-amber-50 text-amber-500"
                              : "border-slate-200 bg-white text-slate-400 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-500"
                              }`}
                            title={
                              isFavourite
                                ? "Remove from favourites"
                                : "Add to favourites"
                            }
                            aria-label={
                              isFavourite
                                ? `Remove ${item.name} from favourites`
                                : `Add ${item.name} to favourites`
                            }
                          >
                            <Star
                              className="h-3.5 w-3.5"
                              fill={isFavourite ? "currentColor" : "none"}
                            />
                          </button>

                          {/* Favourite Keyboard Shortcut */}
                          {shortcutNumber !== undefined && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(item);
                              }}
                              disabled={isOutOfStock}
                              className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                              title={`Add ${item.name} to cart (keyboard shortcut ${shortcutNumber === 10 ? "0" : shortcutNumber})`}
                              aria-label={`Add ${item.name} to cart using shortcut ${shortcutNumber}`}
                            >
                              {shortcutNumber}
                            </button>
                          )}

                          {/* In Cart Badge */}
                          {inCartQty > 0 && (
                            <span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-emerald-600 px-2.5 py-1 text-[9px] font-bold text-white shadow-sm">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              {inCartQty} in cart
                            </span>
                          )}
                        </div>

                        {/* Product Name & Code */}
                        <div className="mt-3">
                          <h4 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 group-hover:text-emerald-700">
                            {item.name}
                          </h4>

                          {item.brand?.trim() && (
                            <p className="mt-1 text-[11px] font-bold text-blue-600">
                              {item.brand}
                            </p>
                          )}

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

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={(e) => {
                                e.stopPropagation();
                                openPriceEditModal(item);
                              }}
                              className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 shadow-2xs transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-40"
                              title="Edit unit price for this product before selling"
                            >
                              <Pencil className="h-3 w-3 text-emerald-600" />
                              <span className="hidden sm:inline">Price</span>
                            </button>

                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(item);
                              }}
                              className={`flex h-8 w-8 items-center justify-center rounded-xl shadow-sm transition ${isOutOfStock
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                : "bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95"
                                }`}
                              title="Add to order"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
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
              cart.map((item) => {
                const itemKey = `${item.type}-${item.id}`;
                const isEditingThisPrice = editingPriceKey === itemKey;

                return (
                  <div key={itemKey} className="p-3.5 hover:bg-slate-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-900">
                            {item.name}
                          </p>

                          {item.brand?.trim() && (
                            <p className="mt-0.5 text-[10px] font-semibold text-blue-600">
                              Brand: {item.brand}
                            </p>
                          )}
                        </div>
                        {/* Inline Unit Price Editor */}
                        {isEditingThisPrice ? (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500">Rs.</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              autoFocus
                              value={editPriceValue}
                              onChange={(e) => setEditPriceValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSavePrice(item);
                                if (e.key === "Escape") setEditingPriceKey(null);
                              }}
                              className="h-6 w-20 rounded border border-emerald-400 bg-white px-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSavePrice(item)}
                              className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPriceKey(null)}
                              className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openPriceEditModal(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition shadow-2xs"
                              title="Click to edit unit price for this product"
                            >
                              <span className={item.originalPrice !== undefined && item.price !== item.originalPrice ? "text-emerald-700 font-black" : ""}>
                                {formatRs(item.price)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">/ {item.unit}</span>
                              <Pencil className="h-2.5 w-2.5 text-emerald-600" />
                            </button>

                            {item.originalPrice !== undefined && item.price !== item.originalPrice ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] line-through text-slate-400">{formatRs(item.originalPrice)}</span>
                                <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-800">
                                  Custom Price
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openPriceEditModal(item)}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                                title="Edit unit price"
                              >
                                Edit Price
                              </button>
                            )}
                          </div>
                        )}

                        {/* Warranty Selector */}
                        {item.type === "PRODUCT" &&
                          item.warrantyEnabled && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <ShieldCheck
                                className={`h-3.5 w-3.5 shrink-0 ${(item.warrantyMonths ?? 0) > 0
                                  ? "text-emerald-600"
                                  : "text-slate-400"
                                  }`}
                              />
                              <select
                                value={item.warrantyMonths ?? 0}
                                onChange={(e) =>
                                  updateItemWarranty(item, Number(e.target.value))
                                }
                                className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold outline-none cursor-pointer transition ${(item.warrantyMonths ?? 0) > 0
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-extrabold"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                  }`}
                                title="Set product warranty duration"
                              >
                                <option value="0">No Warranty</option>
                                <option value="1">1 Month</option>
                                <option value="2">2 Months</option>
                                <option value="3">3 Months</option>
                                <option value="4">4 Months</option>
                                <option value="5">5 Months</option>
                                <option value="6">6 Months</option>
                                <option value="12">12 Months</option>
                                <option value="24">24 Months</option>
                              </select>
                            </div>
                          )}
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
                );
              })
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
      {/* MOBILE STICKY FLOATING CART BAR (Screens < lg) */}
      {/* ================================================= */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <ShoppingCart className="h-5 w-5" />
              {totalItemsCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white">
                  {totalItemsCount}
                </span>
              )}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {totalItemsCount} item{totalItemsCount === 1 ? "" : "s"}
              </div>
              <div className="text-sm font-black text-slate-900">
                {formatRs(total)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95"
          >
            <span>View Cart ({totalItemsCount})</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* MOBILE SLIDE-OVER CART DRAWER (Screens < lg) */}
      {/* ================================================= */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-slate-800" />
                <h2 className="text-sm font-black text-slate-900">Current Order</h2>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                  {totalItemsCount} items
                </span>
              </div>

              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700 mr-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
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
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>New</span>
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                    <ShoppingCart className="h-7 w-7" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-700">Cart is empty</h3>
                  <p className="mt-1 text-xs text-slate-400 max-w-[200px]">
                    Select products from any category to build the customer&apos;s bill.
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const itemKey = `${item.type}-${item.id}`;
                  const isEditingThisPrice = editingPriceKey === itemKey;

                  return (
                    <div key={itemKey} className="p-3.5 hover:bg-slate-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-900">
                              {item.name}
                            </p>

                            {item.brand?.trim() && (
                              <p className="mt-0.5 text-[10px] font-semibold text-blue-600">
                                Brand: {item.brand}
                              </p>
                            )}
                          </div>

                          {/* Editable unit price */}
                          {isEditingThisPrice ? (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-500">Rs.</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                autoFocus
                                value={editPriceValue}
                                onChange={(e) => setEditPriceValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSavePrice(item);
                                  if (e.key === "Escape") setEditingPriceKey(null);
                                }}
                                className="h-6 w-20 rounded border border-emerald-400 bg-white px-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSavePrice(item)}
                                className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPriceKey(null)}
                                className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openPriceEditModal(item)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition shadow-2xs"
                                title="Click to edit unit price for this product"
                              >
                                <span className={item.originalPrice !== undefined && item.price !== item.originalPrice ? "text-emerald-700 font-black" : ""}>
                                  {formatRs(item.price)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-normal">/ {item.unit}</span>
                                <Pencil className="h-2.5 w-2.5 text-emerald-600" />
                              </button>

                              {item.originalPrice !== undefined && item.price !== item.originalPrice ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] line-through text-slate-400">{formatRs(item.originalPrice)}</span>
                                  <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-800">
                                    Custom Price
                                  </span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openPriceEditModal(item)}
                                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
                                  title="Edit unit price"
                                >
                                  Edit Price
                                </button>
                              )}
                            </div>
                          )}

                          {/* Warranty Selector */}
                          {item.type === "PRODUCT" &&
                            item.warrantyEnabled && (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <ShieldCheck
                                  className={`h-3.5 w-3.5 shrink-0 ${(item.warrantyMonths ?? 0) > 0
                                    ? "text-emerald-600"
                                    : "text-slate-400"
                                    }`}
                                />
                                <select
                                  value={item.warrantyMonths ?? 0}
                                  onChange={(e) =>
                                    updateItemWarranty(item, Number(e.target.value))
                                  }
                                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold outline-none cursor-pointer transition ${(item.warrantyMonths ?? 0) > 0
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-extrabold"
                                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                    }`}
                                  title="Set product warranty duration"
                                >
                                  <option value="0">No Warranty</option>
                                  <option value="1">1 Month</option>
                                  <option value="2">2 Months</option>
                                  <option value="3">3 Months</option>
                                  <option value="4">4 Months</option>
                                  <option value="5">5 Months</option>
                                  <option value="6">6 Months</option>
                                  <option value="12">12 Months</option>
                                  <option value="24">24 Months</option>
                                </select>
                              </div>
                            )}
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
                  );
                })
              )}
            </div>

            {/* Totals & Checkout Button */}
            <div className="shrink-0 border-t border-slate-200 bg-slate-50/90 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">Discount (Rs.)</span>
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

              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">{formatRs(subtotal)}</span>
                </div>
                {taxTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span className="font-semibold text-slate-800">{formatRs(taxTotal)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Discount</span>
                    <span>- {formatRs(discountAmount)}</span>
                  </div>
                )}
                <div className="border-t border-dashed border-slate-200 pt-1.5" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900">Total Payable</span>
                  <span className="text-xl font-black text-slate-900">{formatRs(total)}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={openPaymentModal}
                className="mt-3.5 flex h-12 w-full items-center justify-between rounded-xl bg-emerald-600 px-4 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300"
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
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* 3. PAYMENT MODAL (FULLY RESPONSIVE WITH FIXED FOOTER) */}
      {/* ================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative flex flex-col w-full max-w-lg max-h-[90dvh] sm:max-h-[85vh] rounded-2xl bg-white shadow-2xl overflow-hidden my-auto overscroll-contain">
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
                        className={`flex items-center gap-2 rounded-xl border p-2 text-xs font-bold transition ${isSelected
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative flex flex-col w-full max-w-lg max-h-[90dvh] sm:max-h-[85vh] rounded-2xl bg-white shadow-2xl overflow-hidden my-auto overscroll-contain">
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

                {/* Warranties Issued */}
                {lastCompletedBill.warranties && lastCompletedBill.warranties.length > 0 && (
                  <div className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 text-xs text-emerald-950">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-800 mb-1.5 text-[11px]">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Official Warranty Certificates ({lastCompletedBill.warranties.length})
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      {lastCompletedBill.warranties.map((w, idx) => (
                        <div key={idx} className="rounded-lg bg-white/90 p-2 border border-emerald-200 shadow-2xs">
                          <div className="flex items-center justify-between font-mono font-bold text-emerald-700">
                            <span>{w.warrantyCode}</span>
                            <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] text-emerald-800">
                              {w.durationMonths} Months
                            </span>
                          </div>
                          <div className="text-slate-800 truncate font-sans text-xs font-semibold mt-0.5">
                            {w.productName}
                          </div>
                          <div className="text-slate-500 text-[10px] mt-0.5">
                            Valid Until: <strong className="text-slate-700">{w.expiryDate}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

      {/* ================================================= */}
      {/* 6. DEDICATED PRODUCT / SERVICE PRICE EDIT MODAL */}
      {/* ================================================= */}
      {priceEditModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative flex flex-col w-full max-w-md max-h-[90dvh] sm:max-h-[85vh] rounded-2xl bg-white shadow-2xl overflow-hidden my-auto overscroll-contain">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Edit Unit Selling Price (Rs.)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Custom rate for this sale transaction
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPriceEditModalItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Product Info Card */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 shadow-2xs">
                    {priceEditModalItem.item.category}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {priceEditModalItem.item.code}
                  </span>
                </div>
                <h4 className="mt-1.5 text-sm font-extrabold text-slate-900">
                  {priceEditModalItem.item.name}
                </h4>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span>Catalog Base Price:</span>
                  <span className="font-bold text-slate-800">
                    {formatRs(priceEditModalItem.originalPrice)}
                  </span>
                  <span>per {priceEditModalItem.item.unit}</span>
                </div>
              </div>

              {/* New Price Input Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  New Unit Price for this Customer (Rs.)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    autoFocus
                    value={priceModalInputValue}
                    onChange={(e) => setPriceModalInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleApplyModalPrice();
                      if (e.key === "Escape") setPriceEditModalItem(null);
                    }}
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                    className="h-12 w-full rounded-xl border-2 border-emerald-500/50 bg-white pl-10 pr-4 text-xl font-black text-slate-900 shadow-inner focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              {/* Quick Preset Discount & Price Adjustment Buttons */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Quick Adjustments &amp; Discounts
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPriceModalInputValue(priceEditModalItem.originalPrice.toString())}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs"
                  >
                    Reset (Rs. {priceEditModalItem.originalPrice})
                  </button>
                  {[5, 10, 15, 20].map((pct) => {
                    const discounted = Math.max(0, Math.round(priceEditModalItem.originalPrice * (1 - pct / 100)));
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setPriceModalInputValue(discounted.toString())}
                        className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-2 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-2xs"
                      >
                        -{pct}% (Rs. {discounted})
                      </button>
                    );
                  })}
                  {[10, 50, 100, 200].map((amt) => {
                    if (priceEditModalItem.originalPrice > amt) {
                      const reduced = priceEditModalItem.originalPrice - amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPriceModalInputValue(reduced.toString())}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs"
                        >
                          -Rs. {amt}
                        </button>
                      );
                    }
                    return null;
                  })}
                  <button
                    type="button"
                    onClick={() => setPriceModalInputValue("0")}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-2xs"
                  >
                    Free (Rs. 0)
                  </button>
                </div>
              </div>

              {/* Live Calculation Preview */}
              {(() => {
                const val = parseFloat(priceModalInputValue) || 0;
                const diff = val - priceEditModalItem.originalPrice;
                const pctDiff = priceEditModalItem.originalPrice > 0 ? (diff / priceEditModalItem.originalPrice) * 100 : 0;
                return (
                  <div className={`rounded-xl p-3 border text-xs ${diff === 0
                    ? "bg-slate-50 border-slate-200 text-slate-600"
                    : diff < 0
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-blue-50 border-blue-200 text-blue-800"
                    }`}>
                    <div className="flex justify-between items-center font-bold">
                      <span>Rate Difference:</span>
                      <span className="text-sm font-black">
                        {diff > 0 ? `+Rs. ${diff.toFixed(2)}` : diff < 0 ? `-Rs. ${Math.abs(diff).toFixed(2)}` : "No change"}
                        {diff !== 0 && ` (${pctDiff.toFixed(1)}%)`}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] opacity-80">
                      {priceEditModalItem.inCart
                        ? `Unit price will be applied to current cart item.`
                        : `Item will be added to the customer's order with this custom unit price.`}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Fixed Footer */}
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 p-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setPriceEditModalItem(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyModalPrice}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-[0.99] transition"
              >
                Apply Custom Price
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
