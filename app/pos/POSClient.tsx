"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Apple,
  ArrowRight,
  ArrowUpDown,
  Banknote,
  Book,
  BookOpen,
  Box,
  Brush,
  Cable,
  Camera,
  CalendarDays,
  CheckCircle2,
  Calculator,
  Clock,
  ClipboardList,
  Copy,
  CreditCard,
  FileText,
  FolderOpen,
  Home,
  Layers,
  Loader2,
  LogOut,
  Minus,
  Monitor,
  Package,
  Palette,
  PauseCircle,
  Pencil,
  PenTool,
  PlayCircle,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  ScanLine,
  Scissors,
  Search,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  Star,
  Smartphone,
  Trash2,
  UserPlus,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import React from "react";
import PDFCounterModal, {
  type PDFCounterCartEntry,
} from "@/components/pos/PDFCounterModal";
import POSCalculator from "@/components/pos/POSCalculator";
import ThemeToggle from "@/components/ThemeToggle";

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
  iconName: CategoryIconName;
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
  paidAmount: number;
  balanceAmount: number;
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

type HeldCart = {
  id: string;
  holdNumber: number;
  cart: CartItem[];
  selectedCustomerId: number | null;
  selectedCustomerName: string;
  discountInput: string;
  note: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  itemsCount: number;
  heldAt: string;
};

type POSPaletteId =
  | "lagoon"
  | "cobalt"
  | "orchid"
  | "sage"
  | "arctic"
  | "marigold"
  | "tangerine"
  | "cherry"
  | "plum"
  | "graphite";

const POS_PALETTE_STORAGE_KEY = "pubudu-pos-palette";
const POS_PALETTE_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

const POS_PALETTES: Array<{
  id: POSPaletteId;
  name: string;
  description: string;
  swatch: string;
  shades: Record<(typeof POS_PALETTE_SHADES)[number], string>;
}> = [
  {
    id: "lagoon",
    name: "Lagoon",
    description: "Balanced teal",
    swatch: "#0d9488",
    shades: {
      50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4", 300: "#5eead4", 400: "#2dd4bf",
      500: "#14b8a6", 600: "#0d9488", 700: "#0f766e", 800: "#115e59", 900: "#134e4a", 950: "#042f2e",
    },
  },
  {
    id: "cobalt",
    name: "Cobalt",
    description: "Confident blue",
    swatch: "#2563eb",
    shades: {
      50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa",
      500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8", 800: "#1e40af", 900: "#1e3a8a", 950: "#172554",
    },
  },
  {
    id: "orchid",
    name: "Orchid",
    description: "Expressive violet",
    swatch: "#7c3aed",
    shades: {
      50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd", 400: "#a78bfa",
      500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9", 800: "#5b21b6", 900: "#4c1d95", 950: "#2e1065",
    },
  },
  {
    id: "sage",
    name: "Sage",
    description: "Calm botanical green",
    swatch: "#16a34a",
    shades: {
      50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 300: "#86efac", 400: "#4ade80",
      500: "#22c55e", 600: "#16a34a", 700: "#15803d", 800: "#166534", 900: "#14532d", 950: "#052e16",
    },
  },
  {
    id: "arctic",
    name: "Arctic",
    description: "Fresh sky blue",
    swatch: "#0284c7",
    shades: {
      50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 300: "#7dd3fc", 400: "#38bdf8",
      500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1", 800: "#075985", 900: "#0c4a6e", 950: "#082f49",
    },
  },
  {
    id: "marigold",
    name: "Marigold",
    description: "Warm golden yellow",
    swatch: "#d97706",
    shades: {
      50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d", 400: "#fbbf24",
      500: "#f59e0b", 600: "#d97706", 700: "#b45309", 800: "#92400e", 900: "#78350f", 950: "#451a03",
    },
  },
  {
    id: "tangerine",
    name: "Tangerine",
    description: "Bright citrus orange",
    swatch: "#ea580c",
    shades: {
      50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa", 300: "#fdba74", 400: "#fb923c",
      500: "#f97316", 600: "#ea580c", 700: "#c2410c", 800: "#9a3412", 900: "#7c2d12", 950: "#431407",
    },
  },
  {
    id: "cherry",
    name: "Cherry",
    description: "Bold ruby red",
    swatch: "#dc2626",
    shades: {
      50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 300: "#fca5a5", 400: "#f87171",
      500: "#ef4444", 600: "#dc2626", 700: "#b91c1c", 800: "#991b1b", 900: "#7f1d1d", 950: "#450a0a",
    },
  },
  {
    id: "plum",
    name: "Plum",
    description: "Rich magenta violet",
    swatch: "#c026d3",
    shades: {
      50: "#fdf4ff", 100: "#fae8ff", 200: "#f5d0fe", 300: "#f0abfc", 400: "#e879f9",
      500: "#d946ef", 600: "#c026d3", 700: "#a21caf", 800: "#86198f", 900: "#701a75", 950: "#4a044e",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Quiet slate neutral",
    swatch: "#475569",
    shades: {
      50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0", 300: "#cbd5e1", 400: "#94a3b8",
      500: "#64748b", 600: "#475569", 700: "#334155", 800: "#1e293b", 900: "#0f172a", 950: "#020617",
    },
  },
];

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const timeStr = date.toLocaleTimeString("en-LK", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (diffMins < 1) return `Just now (${timeStr})`;
    if (diffMins === 1) return `1 min ago (${timeStr})`;
    if (diffMins < 60) return `${diffMins} mins ago (${timeStr})`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return `1 hr ago (${timeStr})`;
    return `${diffHours} hrs ago (${timeStr})`;
  } catch {
    return "";
  }
}

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
  bg: "bg-slate-50 dark:bg-slate-800/60",
  text: "text-slate-700 dark:text-slate-200",
  border: "border-slate-200 dark:border-slate-700",
  badgeBg: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200",
  activeBg: "bg-slate-900 dark:bg-slate-800",
  activeText: "text-white",
  activeRing: "ring-slate-900 dark:ring-slate-800",
};

const CATEGORY_ICONS = {
  Apple,
  Book,
  BookOpen,
  Box,
  Brush,
  Cable,
  Camera,
  ClipboardList,
  Copy,
  FileText,
  FolderOpen,
  Layers,
  Monitor,
  Package,
  Palette,
  PenTool,
  Printer,
  Scissors,
  ShoppingBasket,
  Smartphone,
  Wrench,
};

type CategoryIconName = keyof typeof CATEGORY_ICONS;

const FALLBACK_CATEGORY_ICONS: CategoryIconName[] = [
  "Package",
  "Box",
  "ClipboardList",
  "FolderOpen",
  "FileText",
  "Book",
  "ShoppingBasket",
  "Wrench",
  "Palette",
  "Camera",
  "Cable",
  "Smartphone",
  "Scissors",
  "PenTool",
  "Printer",
  "Layers",
  "Apple",
  "Brush",
  "Monitor",
  "Copy",
  "BookOpen",
];

function getCategoryIconName(
  type: "PRODUCT" | "SERVICE",
  name: string,
  description: string | null = null,
  id = 0
): CategoryIconName {
  const searchableName = `${name} ${description || ""}`
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const categoryIconRules: Array<[RegExp, CategoryIconName]> = [
    [/\b(photo|photography|camera|image|picture)\b|ඡායාරූප|කැමරා/i, "Camera"],
    [/\b(copy|photocopy|scan|xerox)\b|පිටපත්|කොපි|ස්කෑන්/i, "Copy"],
    [/\b(print|printing|printer)\b|මුද්‍රණ|ප්‍රින්ට්/i, "Printer"],
    [/\b(laminat\w*)\b|ලැමිනේට්|ලැමිනේෂන්/i, "Layers"],
    [/\b(bind|binding)\b|බයින්ඩින්|බයින්ඩ්/i, "Book"],
    [/\b(stationer\w*|paper|book|pen|school|office supplies?)\b|ලිපිද්‍රව්‍ය|පොත්|පෑන්/i, "BookOpen"],
    [/\b(phone|mobile|smartphone|telephone)\b|දුරකථන|ෆෝන්|මොබයිල්|ජංගම/i, "Smartphone"],
    [/\b(charger|cable|wire|adapter)\b|කේබල්|චාජර්/i, "Cable"],
    [/\b(graphic|design|art|colour|color|paint|creative)\b|ග්‍රැෆික්|ඩිසයින්|කලා|වර්ණ|පාට/i, "Palette"],
    [/\b(computer|laptop|desktop|electronics?)\b|පරිගණක|ලැප්ටොප්|ඉලෙක්ට්‍රොනික/i, "Monitor"],
    [/\b(fruit|fruits|vegetable|vegetables|produce)\b|පළතුරු|එළවළු/i, "Apple"],
    [/\b(grocery|groceries|supermarket|food)\b|සිල්ලර|ආහාර|සුපිරි වෙළඳසැල්/i, "ShoppingBasket"],
    [/\b(tool|tools|repair|maintenance|hardware)\b|අලුත්වැඩියා|මෙවලම්/i, "Wrench"],
    [/\b(document|form|record)\b|ලේඛන|ලියකියවිලි/i, "FileText"],
    [/\b(accessor\w*|spare parts?)\b|උපාංග|අමතර කොටස්/i, "Package"],
  ];

  const matchedRule = categoryIconRules.find(([pattern]) => pattern.test(searchableName));
  if (matchedRule) return matchedRule[1];

  const typeOffset = type === "SERVICE" ? Math.floor(FALLBACK_CATEGORY_ICONS.length / 2) : 0;
  const fallbackIndex = (Math.max(0, id - 1) + typeOffset) % FALLBACK_CATEGORY_ICONS.length;
  return FALLBACK_CATEGORY_ICONS[fallbackIndex];
}

function renderCategoryIcon(
  iconName: CategoryIconName,
  className = "h-4 w-4"
) {
  const CategoryIcon = CATEGORY_ICONS[iconName];
  return <CategoryIcon className={className} />;
}

// =========================================================
// MAIN POS CLIENT COMPONENT
// =========================================================

export default function POSClient({
  imageMode = false,
  user,
}: {
  imageMode?: boolean;
  user: { username: string; fullName: string };
}) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const palettePickerRef = useRef<HTMLDivElement>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  const [posPaletteId, setPosPaletteId] = useState<POSPaletteId>("lagoon");
  const [isPaletteMenuOpen, setIsPaletteMenuOpen] = useState(false);
  const activePalette = useMemo(
    () => POS_PALETTES.find((palette) => palette.id === posPaletteId) ?? POS_PALETTES[0],
    [posPaletteId]
  );
  const paletteStyle = useMemo(
    () => Object.fromEntries(
      POS_PALETTE_SHADES.map((shade) => [`--color-teal-${shade}`, activePalette.shades[shade]])
    ) as React.CSSProperties,
    [activePalette]
  );

  useEffect(() => {
    const updateDateTime = () => setCurrentDateTime(new Date());
    updateDateTime();

    const intervalId = window.setInterval(updateDateTime, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    try {
      const storedPalette = window.localStorage.getItem(POS_PALETTE_STORAGE_KEY);
      if (POS_PALETTES.some((palette) => palette.id === storedPalette)) {
        setPosPaletteId(storedPalette as POSPaletteId);
      }
    } catch {
      // The POS still works with the default palette when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!isPaletteMenuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!palettePickerRef.current?.contains(event.target as Node)) {
        setIsPaletteMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isPaletteMenuOpen]);

  const selectPOSPalette = (paletteId: POSPaletteId) => {
    setPosPaletteId(paletteId);
    setIsPaletteMenuOpen(false);
    try {
      window.localStorage.setItem(POS_PALETTE_STORAGE_KEY, paletteId);
    } catch {
      // Keep the selected palette active for this session if storage is unavailable.
    }
  };

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to log out.");
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to log out.");
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, router]);

  // Data states
  const [items, setItems] = useState<POSItem[]>([]);
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsHasMore, setItemsHasMore] = useState(false);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [loadingMoreItems, setLoadingMoreItems] = useState(false);
  const [productCategories, setProductCategories] = useState<POSCategory[]>([]);
  const [serviceCategories, setServiceCategories] = useState<POSCategory[]>([]);
  const [customers, setCustomers] = useState<POSCustomer[]>([]);
  const [customersPage, setCustomersPage] = useState(1);
  const [customersHasMore, setCustomersHasMore] = useState(false);
  const [loadingMoreCustomers, setLoadingMoreCustomers] = useState(false);
  const [selectedCustomerNameOverride, setSelectedCustomerNameOverride] = useState<string | null>(null);
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

  useEffect(() => {
    let mounted = true;

    fetch("/api/pos/pdf-counter/access", {
      cache: "no-store",
    })
      .then((response) =>
        response.ok ? response.json() : { allowed: false }
      )
      .then((data) => {
        if (mounted) {
          setCanAccessPDFCounter(data.allowed === true);
        }
      })
      .catch(() => {
        if (mounted) {
          setCanAccessPDFCounter(false);
        }
      });

    return () => {
      mounted = false;
    };
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
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] =
    useState(false);

  // Discount
  const [discountInput, setDiscountInput] = useState("");

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [canAccessPDFCounter, setCanAccessPDFCounter] = useState(false);
  const [isPDFCounterOpen, setIsPDFCounterOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorDisplay, setCalculatorDisplay] = useState("0");
  const [calculatorStoredValue, setCalculatorStoredValue] =
    useState<number | null>(null);
  const [calculatorOperator, setCalculatorOperator] = useState<
    "+" | "-" | "×" | "÷" | null
  >(null);
  const [calculatorNewNumber, setCalculatorNewNumber] = useState(false);

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

  // Held Carts State (Persistent in Local Storage)
  const HELD_CARTS_STORAGE_KEY = "pubudu-pos-held-carts";
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [heldCartsLoaded, setHeldCartsLoaded] = useState(false);
  const [isHeldCartsModalOpen, setIsHeldCartsModalOpen] = useState(false);
  const [isHoldConfirmModalOpen, setIsHoldConfirmModalOpen] = useState(false);
  const [holdNoteInput, setHoldNoteInput] = useState("");
  const [pendingResumeHeldCart, setPendingResumeHeldCart] =
    useState<HeldCart | null>(null);
  const [heldCartSearch, setHeldCartSearch] = useState("");

  // Load held carts from Local Storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HELD_CARTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHeldCarts(parsed);
        }
      }
    } catch (error) {
      console.error("LOAD HELD CARTS ERROR:", error);
    } finally {
      setHeldCartsLoaded(true);
    }
  }, []);

  // Save held carts to Local Storage
  useEffect(() => {
    if (!heldCartsLoaded) return;
    try {
      localStorage.setItem(
        HELD_CARTS_STORAGE_KEY,
        JSON.stringify(heldCarts)
      );
    } catch (error) {
      console.error("SAVE HELD CARTS ERROR:", error);
      toast.error("Unable to save held orders.");
    }
  }, [heldCarts, heldCartsLoaded]);

  // =======================================================
  // FETCH ITEMS & CUSTOMERS FROM DATABASE
  // =======================================================

  const loadItems = useCallback(async (page = 1, append = false) => {
    try {
      if (append) setLoadingMoreItems(true);
      else setLoading(true);

      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      if (selectedCategory !== "All") {
        const [categoryType, categoryId] = selectedCategory.split("-");
        params.set("categoryType", categoryType);
        params.set("categoryId", categoryId);
      }
      const response = await fetch(`/api/pos/items?${params.toString()}`, { cache: "no-store" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load products.");
      }

      setItems((current) => append ? [...current, ...(result.data || [])] : (result.data || []));
      setProductCategories(result.categories?.products || []);
      setServiceCategories(result.categories?.services || []);
      setItemsPage(page);
      setItemsHasMore(result.pagination?.hasMore === true);
      setItemsTotal(Number(result.pagination?.total || 0));
    } catch (err) {
      console.error("LOAD POS ITEMS ERROR:", err);
      const msg = err instanceof Error ? err.message : "Failed to load items.";
      toast.error(msg);
    } finally {
      setLoading(false);
      setLoadingMoreItems(false);
    }
  }, [search, selectedCategory]);

  const loadCustomers = useCallback(async (query = "", page = 1, append = false) => {
    try {
      if (append) setLoadingMoreCustomers(true);
      const params = new URLSearchParams({ page: String(page) });
      if (query.trim()) params.set("search", query.trim());
      const response = await fetch(`/api/pos/customers?${params.toString()}`, { cache: "no-store" });
      const result = await response.json();

      if (response.ok && result.success) {
        setCustomers((current) => append ? [...current, ...(result.data || [])] : (result.data || []));
        setCustomersPage(page);
        setCustomersHasMore(result.pagination?.hasMore === true);
      }
    } catch (err) {
      console.error("LOAD CUSTOMERS ERROR:", err);
    } finally {
      setLoadingMoreCustomers(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadItems(1, false), search.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadItems, search]);

  useEffect(() => {
    const timer = setTimeout(() => void loadCustomers(customerSearch, 1, false), customerSearch.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [customerSearch, loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const keyword = customerSearch.trim().toLowerCase();

    if (!keyword) return customers;

    return customers.filter((customer) =>
      [
        customer.name,
        customer.phone || "",
        customer.code || "",
      ].some((value) => value.toLowerCase().includes(keyword))
    );
  }, [customers, customerSearch]);

  const selectedCustomerName = selectedCustomerId === null
    ? "Walk-in Customer"
    : selectedCustomerNameOverride || customers.find((customer) => customer.id === selectedCustomerId)?.name || "Customer";

  function handleCustomerSelect(customerId: number | null) {
    setSelectedCustomerId(customerId);
    setSelectedCustomerNameOverride(
      customerId === null ? null : customers.find((customer) => customer.id === customerId)?.name || null
    );
    setCustomerSearch("");
    setIsCustomerDropdownOpen(false);
  }

  // =======================================================
  // DATABASE-DRIVEN PRODUCT & SERVICE CATEGORIES
  // =======================================================

  const categoryList = useMemo<CategoryInfo[]>(() => {
    const categories = [
      ...productCategories,
      ...serviceCategories,
    ];

    const assignedIcons = new Map<string, CategoryIconName>();
    const usedIcons = new Set<CategoryIconName>();

    [...categories]
      .sort((a, b) => a.type.localeCompare(b.type) || a.id - b.id)
      .forEach((category) => {
        let iconName = getCategoryIconName(
          category.type,
          category.name,
          category.description,
          category.id
        );

        if (usedIcons.has(iconName)) {
          const typeOffset = category.type === "SERVICE"
            ? Math.floor(FALLBACK_CATEGORY_ICONS.length / 2)
            : 0;
          const startIndex = (Math.max(0, category.id - 1) + typeOffset) % FALLBACK_CATEGORY_ICONS.length;

          for (let offset = 0; offset < FALLBACK_CATEGORY_ICONS.length; offset += 1) {
            const candidate = FALLBACK_CATEGORY_ICONS[
              (startIndex + offset) % FALLBACK_CATEGORY_ICONS.length
            ];
            if (!usedIcons.has(candidate)) {
              iconName = candidate;
              break;
            }
          }
        }

        usedIcons.add(iconName);
        assignedIcons.set(`${category.type}-${category.id}`, iconName);
      });

    return categories.map((category) => ({
      name: category.name,
      count: Number(category.count || 0),
      iconName: assignedIcons.get(`${category.type}-${category.id}`)
        || getCategoryIconName(
          category.type,
          category.name,
          category.description,
          category.id
        ),
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

  const addPDFCounterServicesToCart = useCallback(
    (entries: PDFCounterCartEntry[]) => {
      if (!canAccessPDFCounter) return;

      const additions = entries.map((entry) => ({
        item: items.find(
          (item) =>
            item.type === "SERVICE" &&
            item.id === entry.serviceId
        ),
        quantity: entry.quantity,
      }));

      if (
        additions.some(
          (addition) =>
            !addition.item ||
            !Number.isSafeInteger(addition.quantity) ||
            addition.quantity <= 0
        )
      ) {
        toast.error("PDF Counter service selection is invalid.");
        return;
      }

      setCart((current) => {
        const next = [...current];

        for (const { item, quantity } of additions) {
          if (!item) continue;

          const existingIndex = next.findIndex(
            (cartItem) =>
              cartItem.type === "SERVICE" &&
              cartItem.id === item.id
          );

          if (existingIndex >= 0) {
            next[existingIndex] = {
              ...next[existingIndex],
              quantity: next[existingIndex].quantity + quantity,
            };
          } else {
            next.push({
              ...item,
              quantity,
              originalPrice: item.price,
              warrantyMonths: 0,
            });
          }
        }

        return next;
      });

      toast.success("PDF quantities added to POS cart.");
    },
    [canAccessPDFCounter, items]
  );

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

  // =======================================================
  // HELD CART ACTIONS (බිල්පත් තාවකාලිකව රඳවා තැබීම)
  // =======================================================

  const handleHoldCurrentCart = useCallback(
    (noteText?: string) => {
      if (cart.length === 0) {
        toast.error("Cart is empty. Add items before holding.");
        return;
      }

      const nextHoldNumber =
        heldCarts.length > 0
          ? Math.max(...heldCarts.map((h) => h.holdNumber || 0)) + 1
          : 1;

      const finalNote = (
        noteText !== undefined ? noteText : holdNoteInput
      ).trim();

      const newHeldCart: HeldCart = {
        id: `held_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        holdNumber: nextHoldNumber,
        cart: [...cart],
        selectedCustomerId,
        selectedCustomerName,
        discountInput,
        note: finalNote,
        subtotal,
        taxTotal,
        total,
        itemsCount: totalItemsCount,
        heldAt: new Date().toISOString(),
      };

      setHeldCarts((prev) => [newHeldCart, ...prev]);

      // Clear active cart & reset customer
      setCart([]);
      setSelectedCustomerId(null);
      setSelectedCustomerNameOverride(null);
      setCustomerSearch("");
      setDiscountInput("");
      setHoldNoteInput("");
      setIsHoldConfirmModalOpen(false);

      toast.success(
        `Order #${nextHoldNumber} ${finalNote ? `("${finalNote}") ` : ""}put on hold.`
      );
    },
    [
      cart,
      heldCarts,
      selectedCustomerId,
      selectedCustomerName,
      discountInput,
      holdNoteInput,
      subtotal,
      taxTotal,
      total,
      totalItemsCount,
    ]
  );

  const handleResumeCart = useCallback(
    (
      heldCart: HeldCart,
      action: "SWAP" | "OVERWRITE" = "OVERWRITE"
    ) => {
      if (cart.length > 0 && !pendingResumeHeldCart) {
        // Current cart has items, open conflict prompt
        setPendingResumeHeldCart(heldCart);
        return;
      }

      if (action === "SWAP" && cart.length > 0) {
        // Put current active cart on hold first
        const nextHoldNumber =
          heldCarts.length > 0
            ? Math.max(...heldCarts.map((h) => h.holdNumber || 0)) + 1
            : 1;

        const currentAsHeld: HeldCart = {
          id: `held_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          holdNumber: nextHoldNumber,
          cart: [...cart],
          selectedCustomerId,
          selectedCustomerName,
          discountInput,
          note: `Swapped for #${heldCart.holdNumber}`,
          subtotal,
          taxTotal,
          total,
          itemsCount: totalItemsCount,
          heldAt: new Date().toISOString(),
        };

        setHeldCarts((prev) => [
          currentAsHeld,
          ...prev.filter((h) => h.id !== heldCart.id),
        ]);
        toast.info(`Active cart put on hold as Order #${nextHoldNumber}`);
      } else {
        // Overwrite / load directly
        setHeldCarts((prev) => prev.filter((h) => h.id !== heldCart.id));
      }

      // Load held cart into active
      setCart(heldCart.cart);
      setSelectedCustomerId(heldCart.selectedCustomerId);
      setSelectedCustomerNameOverride(heldCart.selectedCustomerName || null);
      setDiscountInput(heldCart.discountInput);
      setPendingResumeHeldCart(null);
      setIsHeldCartsModalOpen(false);
      setIsMobileCartOpen(false);

      toast.success(
        `Resumed Order #${heldCart.holdNumber} (${heldCart.selectedCustomerName})`
      );
    },
    [
      cart,
      heldCarts,
      selectedCustomerId,
      selectedCustomerName,
      discountInput,
      subtotal,
      taxTotal,
      total,
      totalItemsCount,
      pendingResumeHeldCart,
    ]
  );

  const handleDeleteHeldCart = useCallback((id: string) => {
    setHeldCarts((prev) => prev.filter((h) => h.id !== id));
    toast.success("Held order removed.");
  }, []);

  const handleClearAllHeldCarts = useCallback(() => {
    if (heldCarts.length === 0) return;
    if (window.confirm("Are you sure you want to delete all held orders?")) {
      setHeldCarts([]);
      toast.success("All held orders cleared.");
    }
  }, [heldCarts.length]);

  const filteredHeldCarts = useMemo(() => {
    if (!heldCartSearch.trim()) return heldCarts;
    const q = heldCartSearch.trim().toLowerCase();
    return heldCarts.filter(
      (h) =>
        h.selectedCustomerName.toLowerCase().includes(q) ||
        h.note.toLowerCase().includes(q) ||
        String(h.holdNumber).includes(q) ||
        h.cart.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [heldCarts, heldCartSearch]);

  // Keyboard shortcut Alt+H or F4 to view held orders
  useEffect(() => {
    const handleHoldShortcut = (event: KeyboardEvent) => {
      if (
        (event.altKey && (event.key === "h" || event.key === "H")) ||
        event.key === "F4"
      ) {
        event.preventDefault();
        setIsHeldCartsModalOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleHoldShortcut);
    return () => window.removeEventListener("keydown", handleHoldShortcut);
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
  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      e.preventDefault();
      const trimmed = search.trim().toLowerCase();
      let exactMatch = items.find(
        (i) =>
          (i.barcode && i.barcode.toLowerCase() === trimmed) ||
          i.code.toLowerCase() === trimmed
      );

      if (!exactMatch) {
        try {
          const params = new URLSearchParams({ search: search.trim(), page: "1" });
          const response = await fetch(`/api/pos/items?${params.toString()}`, { cache: "no-store" });
          const result = await response.json();
          if (response.ok && result.success && Array.isArray(result.data)) {
            exactMatch = result.data.find(
              (item: POSItem) => item.barcode?.toLowerCase() === trimmed || item.code.toLowerCase() === trimmed
            );
          }
        } catch {
          toast.error("Could not look up that barcode. Please try again.");
        }
      }

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
    // Pre-fill cash tendered with exact total (or 0 if Credit is already selected)
    setCashTenderedInput(paymentMethod === "CREDIT" ? "0" : total.toString());
    setIsMobileCartOpen(false);
    setIsPaymentModalOpen(true);
  };

  const cashTendered = useMemo(() => {
    return Math.max(0, Number(cashTenderedInput) || 0);
  }, [cashTenderedInput]);

  const paidNowAmount = useMemo(() => {
    return Math.min(cashTendered, total);
  }, [cashTendered, total]);

  const remainingBalanceAmount = useMemo(() => {
    return Math.max(0, total - paidNowAmount);
  }, [total, paidNowAmount]);

  const changeAmount = useMemo(() => {
    if (paymentMethod !== "CASH") return 0;
    return Math.max(0, cashTendered - total);
  }, [paymentMethod, cashTendered, total]);

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty.");
      return;
    }

    if (remainingBalanceAmount > 0 && !selectedCustomerId) {
      toast.error(
        "Please select a registered customer to put the remaining balance on credit."
      );
      return;
    }

    try {
      setProcessingPayment(true);

      const payload = {
        customerId: selectedCustomerId,
        paymentMethod,
        discount: discountAmount,
        paidAmount: paidNowAmount,
        cashTendered,
        changeAmount,
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
        customerName: selectedCustomer ? selectedCustomer.name : selectedCustomerName,
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
        paidAmount: Number(result.data?.paidAmount ?? paidNowAmount),
        balanceAmount: Number(result.data?.balanceAmount ?? remainingBalanceAmount),
        cashTendered,
        changeAmount,
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
            ${bill.balanceAmount > 0
          ? `
                <div class="summary-row" style="margin-top: 4px;">
                  <span>Paid Amount</span>
                  <span>${formatRs(bill.paidAmount)}</span>
                </div>
                <div class="summary-row" style="color: #c00; font-weight: bold;">
                  <span>Balance Due (Credit)</span>
                  <span>${formatRs(bill.balanceAmount)}</span>
                </div>
              `
          : bill.paymentMethod === "CASH"
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
      setSelectedCustomerNameOverride(result.data.name);
      await loadCustomers("", 1, false);
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

  // =========================================================
  // INDEPENDENT POS CALCULATOR
  // =========================================================

  const handleCalculatorDigit = (digit: string) => {
    setCalculatorDisplay((current) => {
      if (calculatorNewNumber || current === "0") {
        return digit;
      }
      return current.length < 15 ? current + digit : current;
    });

    setCalculatorNewNumber(false);
  };

  const handleCalculatorDecimal = () => {
    if (calculatorNewNumber) {
      setCalculatorDisplay("0.");
      setCalculatorNewNumber(false);
      return;
    }

    setCalculatorDisplay((current) =>
      current.includes(".") ? current : current + "."
    );
  };

  const handleCalculatorOperator = (operator: "+" | "-" | "×" | "÷") => {
    const currentValue = Number(calculatorDisplay);

    if (calculatorStoredValue !== null && calculatorOperator && !calculatorNewNumber) {
      let result = calculatorStoredValue;

      switch (calculatorOperator) {
        case "+":
          result += currentValue;
          break;
        case "-":
          result -= currentValue;
          break;
        case "×":
          result *= currentValue;
          break;
        case "÷":
          if (currentValue === 0) {
            toast.error("Cannot divide by zero.");
            return;
          }
          result /= currentValue;
          break;
      }

      setCalculatorStoredValue(result);
      setCalculatorDisplay(String(Number(result.toFixed(10))));
    } else {
      setCalculatorStoredValue(currentValue);
    }

    setCalculatorOperator(operator);
    setCalculatorNewNumber(true);
  };

  const handleCalculatorEquals = () => {
    if (calculatorStoredValue === null || !calculatorOperator) return;

    const currentValue = Number(calculatorDisplay);
    let result = calculatorStoredValue;

    switch (calculatorOperator) {
      case "+":
        result += currentValue;
        break;
      case "-":
        result -= currentValue;
        break;
      case "×":
        result *= currentValue;
        break;
      case "÷":
        if (currentValue === 0) {
          toast.error("Cannot divide by zero.");
          return;
        }
        result /= currentValue;
        break;
    }

    setCalculatorDisplay(String(Number(result.toFixed(10))));
    setCalculatorStoredValue(null);
    setCalculatorOperator(null);
    setCalculatorNewNumber(true);
  };

  const handleCalculatorClear = () => {
    setCalculatorDisplay("0");
    setCalculatorStoredValue(null);
    setCalculatorOperator(null);
    setCalculatorNewNumber(false);
  };

  const handleCalculatorBackspace = () => {
    if (calculatorNewNumber) return;

    setCalculatorDisplay((current) =>
      current.length > 1 ? current.slice(0, -1) : "0"
    );
  };

  // =========================================================
  // CALCULATOR KEYBOARD INPUT
  // =========================================================

  useEffect(() => {
    if (!isCalculatorOpen) return;

    const handleCalculatorKeyboard = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const key = event.key;

      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        handleCalculatorDigit(key);
        return;
      }

      if (key === "." || key === ",") {
        event.preventDefault();
        handleCalculatorDecimal();
        return;
      }

      if (key === "+") {
        event.preventDefault();
        handleCalculatorOperator("+");
        return;
      }

      if (key === "-") {
        event.preventDefault();
        handleCalculatorOperator("-");
        return;
      }

      if (key === "*" || key.toLowerCase() === "x") {
        event.preventDefault();
        handleCalculatorOperator("×");
        return;
      }

      if (key === "/") {
        event.preventDefault();
        handleCalculatorOperator("÷");
        return;
      }

      if (key === "Enter" || key === "=") {
        event.preventDefault();
        handleCalculatorEquals();
        return;
      }

      if (key === "Backspace") {
        event.preventDefault();
        handleCalculatorBackspace();
        return;
      }

      if (key === "Delete") {
        event.preventDefault();
        handleCalculatorClear();
        return;
      }

      if (key === "Escape") {
        event.preventDefault();
        setIsCalculatorOpen(false);
      }
    };

    window.addEventListener("keydown", handleCalculatorKeyboard);

    return () => {
      window.removeEventListener("keydown", handleCalculatorKeyboard);
    };
  }, [
    isCalculatorOpen,
    calculatorNewNumber,
    calculatorStoredValue,
    calculatorOperator,
    calculatorDisplay,
  ]);

  // =======================================================
  // UI RENDER
  // =======================================================

  return (
    <div
      data-pos-palette={posPaletteId}
      style={paletteStyle}
      className="flex h-screen flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased"
    >
      {/* ================================================= */}
      {/* 1. TOP NAVIGATION / HEADER (RESPONSIVE) */}
      {/* ================================================= */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-teal-900/20 dark:border-teal-900 bg-teal-800 dark:bg-teal-950 px-3 sm:px-4 lg:px-6 shadow-sm gap-2">
        {/* Left: Brand & POS Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-500 text-white shadow-md shadow-teal-500/20">
            <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="whitespace-nowrap text-base sm:text-xl font-black tracking-tight text-white">
              Smart POS
            </h1>
            <p className="hidden md:block text-[11px] font-medium text-teal-100/80">
              Sri Lankan Currency (Rs.) • Fast Billing Terminal
            </p>
          </div>
        </div>

        {/* Center: Search & Barcode Input */}
        <div className="mx-1 sm:mx-4 max-w-xl flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search product, barcode or code..."
              className="h-9 sm:h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-8 sm:pl-10 pr-8 text-xs font-medium text-slate-900 dark:text-white transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900/40"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
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
              className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/40 px-2.5 sm:px-3.5 text-xs font-bold text-teal-700 dark:text-teal-300 shadow-sm transition hover:bg-teal-100 dark:hover:bg-teal-900/40"
              title="View or print the last completed bill"
            >
              <Receipt className="h-4 w-4" />
              <span className="hidden md:inline">Last Bill ({lastCompletedBill.invoiceNo})</span>
            </button>
          )}

          {/* Calculator Button */}
          <button
            type="button"
            onClick={() => setIsCalculatorOpen(true)}
            className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/40 px-2.5 sm:px-3.5 text-xs font-bold text-teal-700 dark:text-teal-300 shadow-sm transition hover:bg-teal-100 dark:hover:bg-teal-900/40"
            title="Open Calculator"
          >
            <Calculator className="h-4 w-4" />
            <span>Calculator</span>
          </button>

          {canAccessPDFCounter && (
            <button
              type="button"
              onClick={() => setIsPDFCounterOpen(true)}
              className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 px-2.5 sm:px-3.5 text-xs font-bold text-blue-700 dark:text-blue-300 shadow-sm transition hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              <FileText className="h-4 w-4" />
              <span>PDF Counter</span>
            </button>
          )}

          {/* Held Orders Button */}
          <button
            type="button"
            onClick={() => setIsHeldCartsModalOpen(true)}
            className="relative flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-2.5 sm:px-3.5 text-xs font-bold text-amber-800 dark:text-amber-300 shadow-sm transition hover:bg-amber-100 dark:hover:bg-amber-900/40"
            title="View held orders (Alt+H or F4)"
          >
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Held</span>
            {heldCarts.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white">
                {heldCarts.length}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          <button
            type="button"
            onClick={() => void loadItems(1, false)}
            disabled={loading}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700"
            title="Refresh Catalog"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin text-teal-600" : ""}`}
            />
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 dark:border dark:border-slate-700 px-3 sm:px-4 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 dark:hover:bg-slate-700"
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
        <aside className="hidden w-64 shrink-0 flex-col border-r border-teal-100 dark:border-slate-800 bg-teal-50/40 dark:bg-slate-950 md:flex">
          <div className="border-b border-teal-100 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300">
              Resource Categories
            </p>
            <h2 className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-100">
              Pubudu Creative Services
            </h2>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
            {/* All Items Button */}
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className={`group flex w-full items-center justify-between rounded-xl p-3 text-left transition ${selectedCategory === "All"
                ? "border border-teal-800 dark:border-teal-900 bg-teal-800 dark:bg-teal-950 text-white shadow-sm shadow-teal-950/15"
                : "border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-white dark:hover:bg-slate-800"
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selectedCategory === "All"
                    ? "bg-white/15 text-white"
                    : "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 ring-1 ring-inset ring-slate-100 dark:ring-slate-700"
                    }`}
                >
                  <Layers className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">All Resources</p>
                  <p
                    className={`truncate text-[10px] ${selectedCategory === "All"
                      ? "text-teal-100/80"
                      : "text-slate-400 dark:text-slate-500"
                      }`}
                  >
                    Entire Catalog
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${selectedCategory === "All"
                  ? "bg-white/15 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-inset ring-slate-100 dark:ring-slate-700"
                  }`}
              >
                {items.length}
              </span>
            </button>

            {/* The Categories */}
            {categoryList.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`group flex w-full items-center justify-between rounded-xl p-3 text-left transition ${isSelected
                    ? "border border-teal-800 dark:border-teal-900 bg-teal-800 dark:bg-teal-950 text-white shadow-sm shadow-teal-950/15"
                    : "border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected
                        ? "bg-white/15 text-white"
                        : "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 ring-1 ring-inset ring-slate-100 dark:ring-slate-700"
                        }`}
                    >
                      {renderCategoryIcon(cat.iconName, "h-4 w-4")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{cat.name}</p>
                      <p
                        className={`truncate text-[10px] ${isSelected ? "text-teal-100/80" : "text-slate-400 dark:text-slate-500"
                          }`}
                      >
                        {cat.description}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isSelected
                      ? "bg-white/15 text-white"
                      : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-inset ring-slate-100 dark:ring-slate-700"
                      }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-teal-100 dark:border-slate-800 bg-teal-50 dark:bg-slate-900 p-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-800 text-white dark:bg-teal-700">
                <UserRound className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100" title={user.fullName || user.username}>
                  {user.fullName || user.username}
                </p>
                <p className="truncate text-[10px] text-slate-500 dark:text-slate-400" title={user.username}>
                  {user.username}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/30 disabled:cursor-wait disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                title="Log out"
                aria-label="Log out"
              >
                {isLoggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                <span>{isLoggingOut ? "Logging out" : "Logout"}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ================================================= */}
        {/* CENTER COLUMN: PRODUCT CATALOG */}
        {/* ================================================= */}
        <section className="flex flex-1 flex-col min-w-0 overflow-hidden bg-slate-50/50 dark:bg-slate-950/60 pb-24 lg:pb-0">
          {/* Catalog Header Bar */}
          <div className="relative z-40 flex shrink-0 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 px-4 py-3 backdrop-blur-sm lg:px-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {selectedCategory === "All"
                  ? <Layers className="h-5 w-5" />
                  : renderCategoryIcon(
                    categoryList.find((cat) => cat.key === selectedCategory)?.iconName || "Layers",
                    "h-5 w-5"
                  )}
              </span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100 sm:text-base">
                {selectedCategory === "All"
                  ? "All Products & Services"
                  : categoryList.find((cat) => cat.key === selectedCategory)?.name || "Category"}
              </span>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 sm:text-[11px]">
                {itemsTotal} items available
              </span>
              {imageMode && (
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-950/70 dark:text-teal-300">
                  Image POS
                </span>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              {search && (
                <p className="hidden max-w-40 truncate text-xs text-slate-500 dark:text-slate-400 lg:block">
                  Filtering by &quot;{search}&quot;
                </p>
              )}
              <div className="relative shrink-0" ref={palettePickerRef}>
                <button
                  type="button"
                  onClick={() => setIsPaletteMenuOpen((open) => !open)}
                  aria-label="Choose POS color palette"
                  aria-haspopup="menu"
                  aria-expanded={isPaletteMenuOpen}
                  title="Choose POS color palette"
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-2.5 text-teal-800 shadow-sm transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-teal-800 dark:bg-slate-900 dark:text-teal-200 dark:hover:bg-slate-800"
                >
                  <Palette className="h-4 w-4" />
                  <span className="hidden text-[11px] font-bold md:inline">Palette</span>
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900"
                    style={{ backgroundColor: activePalette.swatch }}
                  />
                </button>
                {isPaletteMenuOpen && (
                  <div
                    role="menu"
                    aria-label="POS color palettes"
                    className="absolute right-0 top-full z-[100] mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="px-2 pb-2 pt-1">
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100">POS color palette</p>
                      <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Choose an accent for your workspace</p>
                    </div>
                    <div className="space-y-1">
                      {POS_PALETTES.map((palette) => {
                        const isSelected = palette.id === posPaletteId;
                        return (
                          <button
                            key={palette.id}
                            type="button"
                            role="menuitemradio"
                            aria-checked={isSelected}
                            onClick={() => selectPOSPalette(palette.id)}
                            className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${isSelected
                              ? "bg-teal-50 ring-1 ring-teal-200 dark:bg-teal-950/50 dark:ring-teal-800"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800"
                              }`}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                              <span className="h-4 w-4 rounded-full ring-4 ring-white dark:ring-slate-700" style={{ backgroundColor: palette.swatch }} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">{palette.name}</span>
                              <span className="block text-[10px] text-slate-500 dark:text-slate-400">{palette.description}</span>
                            </span>
                            {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-300" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              {currentDateTime && (
                <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-teal-100 bg-teal-50/70 px-2.5 py-2 dark:border-teal-900/60 dark:bg-teal-950/30 sm:flex">
                  <CalendarDays className="h-4 w-4 text-teal-700 dark:text-teal-300" />
                  <span className="whitespace-nowrap text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {currentDateTime.toLocaleDateString("en-LK", {
                      timeZone: "Asia/Colombo",
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="h-4 w-px bg-teal-200 dark:bg-teal-800" />
                  <span className="flex items-center gap-1 whitespace-nowrap text-xs font-bold tabular-nums text-teal-800 dark:text-teal-200">
                    <Clock className="h-3.5 w-3.5" />
                    {currentDateTime.toLocaleTimeString("en-LK", {
                      timeZone: "Asia/Colombo",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Horizontal Category Pills (Visible on Mobile & Tablet) */}
          <div className="flex md:hidden items-center gap-1.5 overflow-x-auto border-b border-teal-100 dark:border-slate-800 bg-teal-50/70 dark:bg-slate-900 px-3 py-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${selectedCategory === "All"
                ? "bg-teal-800 dark:bg-teal-700 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-teal-100 dark:hover:bg-slate-700"
                }`}
            >
              <Layers className="h-3 w-3" />
              <span>All ({categoryList.reduce((sum, category) => sum + category.count, 0)})</span>
            </button>
            {categoryList.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${isSelected
                    ? "bg-teal-800 dark:bg-teal-700 text-white shadow-sm"
                    : `${cat.colorScheme.bg} ${cat.colorScheme.text} border border-slate-200 dark:border-slate-700 hover:opacity-90`
                    }`}
                >
                  {renderCategoryIcon(cat.iconName, "h-3 w-3")}
                  <span>{cat.name}</span>
                  <span className="opacity-75">({cat.count})</span>
                </button>
              );
            })}
          </div>

          {/* Product Grid Area */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {loading ? (
              <div className="flex h-96 flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                <p className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                  Loading POS items from database...
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex h-96 flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                  <Search className="h-8 w-8" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                  No items found
                </h3>
                <p className="mt-1 max-w-sm text-xs text-slate-400 dark:text-slate-500">
                  Try another keyword, or switch to a different category above.
                </p>
              </div>
            ) : (
              <div className={`grid ${imageMode ? "grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4" : "grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4"}`}>
                {filteredItems.map((item, index) => {
                  const itemKey = `${item.type}-${item.id}`;
                  const isFavourite = favouriteKeys.includes(itemKey);
                  const shortcutNumber = shortcutNumberMap.get(itemKey);
                  const itemCategoryIconName = categoryList.find(
                    (category) =>
                      category.type === item.categoryType &&
                      category.id === item.categoryId
                  )?.iconName || getCategoryIconName(
                    item.categoryType,
                    item.category,
                    null,
                    item.categoryId
                  );
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

                  return (
                    <React.Fragment key={`${item.type}-${item.id}`}>
                      {index === 0 && isFavourite && (
                        <div className="col-span-full flex items-center gap-2 py-1">
                          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            Favourite Resources
                          </h3>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            ({favouriteKeys.filter((key) =>
                              filteredItems.some(
                                (i) => `${i.type}-${i.id}` === key
                              )
                            ).length})
                          </span>
                          <span className="ml-auto text-[10px] font-medium text-teal-700 dark:text-teal-400">
                            Shortcuts: 1–9, 0
                          </span>
                        </div>
                      )}

                      {!isFavourite && previousWasFavourite && (
                        <>
                          <div className="col-span-full my-2 border-t border-slate-300 dark:border-slate-800" />
                          <div className="col-span-full py-1">
                            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400">
                              All Products & Services
                            </h3>
                          </div>
                        </>
                      )}

                      <div
                        onClick={() => !isOutOfStock && addToCart(item)}
                        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all duration-150 ${isOutOfStock
                          ? "cursor-not-allowed opacity-60 border-slate-200 dark:border-slate-800"
                          : "cursor-pointer border-slate-200 dark:border-slate-800 hover:-translate-y-0.5 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md hover:shadow-teal-900/10 dark:hover:shadow-teal-950/40"
                          } ${inCartQty > 0
                            ? "ring-2 ring-teal-500/80 border-teal-500 dark:border-teal-500"
                            : ""
                          }`}
                      >
                        <div className={`flex flex-1 flex-col bg-teal-50/60 transition-colors dark:bg-teal-950/20 ${isOutOfStock ? "" : "group-hover:bg-teal-100/80 dark:group-hover:bg-teal-950/50"} ${imageMode ? "p-2.5" : "p-3.5"}`}>
                        {imageMode && (
                          <div className="mb-2 flex h-28 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 sm:h-32">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500">
                                <Layers className="h-8 w-8" />
                                <span className="text-[10px] font-medium">No photo</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="flex w-full min-w-0 items-center justify-between gap-2">

                          {/* Category Badge */}
                          <span
                            className="inline-flex min-w-0 max-w-[70%] items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-[9px] font-bold text-teal-800 ring-1 ring-inset ring-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/60"
                          >
                            <span className="shrink-0">
                              {renderCategoryIcon(itemCategoryIconName, "h-3 w-3")}
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
                              ? "border-amber-300 dark:border-amber-600/70 bg-amber-50 dark:bg-amber-950/50 text-amber-500"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-500"
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
                              className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md border border-teal-200 dark:border-teal-800/70 bg-teal-50 dark:bg-teal-950/60 px-1.5 text-[10px] font-black text-teal-700 dark:text-teal-300 transition hover:bg-teal-100 dark:hover:bg-teal-900/40 disabled:cursor-not-allowed disabled:opacity-50"
                              title={`Add ${item.name} to cart (keyboard shortcut ${shortcutNumber === 10 ? "0" : shortcutNumber})`}
                              aria-label={`Add ${item.name} to cart using shortcut ${shortcutNumber}`}
                            >
                              {shortcutNumber}
                            </button>
                          )}

                          {/* In Cart Badge */}
                          {inCartQty > 0 && (
                            <span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-teal-600 px-2.5 py-1 text-[9px] font-bold text-white shadow-sm">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              {inCartQty} in cart
                            </span>
                          )}
                        </div>

                        {/* Product Name & Code */}
                        <div className="mt-3">
                          <h4 className="line-clamp-2 text-lg font-bold leading-snug text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400">
                            {item.name}
                          </h4>

                          {item.brand?.trim() && (
                            <p className="mt-1 text-[11px] font-bold text-teal-700 dark:text-teal-400">
                              {item.brand}
                            </p>
                          )}

                          <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            <span className="min-w-0 flex-1 truncate">{item.code}</span>
                            {item.type === "PRODUCT" && item.stock !== null && (
                              <>
                                <span className="shrink-0">•</span>
                                <span className={`shrink-0 ${isOutOfStock
                                  ? "font-bold text-rose-600 dark:text-rose-400"
                                  : isLowStock
                                    ? "font-medium text-amber-600 dark:text-amber-400"
                                    : "text-slate-400 dark:text-slate-500"
                                  }`}>
                                  {isOutOfStock
                                    ? "Out of stock"
                                    : isLowStock
                                      ? `Low: ${item.stock}`
                                      : `Stock: ${item.stock}`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        </div>

                        {/* Price and Add Button */}
                        <div className={`mt-auto flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 ${imageMode ? "mx-2.5 mb-2.5" : "mx-3.5 mb-3.5"}`}>
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                              {formatRs(item.price)}
                            </p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500">
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
                              className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-[10px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs transition hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-800 dark:hover:text-teal-300 disabled:opacity-40"
                              title="Edit unit price for this product before selling"
                            >
                              <Pencil className="h-3 w-3 text-teal-600 dark:text-teal-400" />
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
                                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                                : "bg-teal-500 text-white hover:bg-teal-600 active:scale-95"
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
            {!loading && itemsHasMore && (
              <div className="flex justify-center py-5">
                <button
                  type="button"
                  onClick={() => void loadItems(itemsPage + 1, true)}
                  disabled={loadingMoreItems}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  {loadingMoreItems ? "Loading…" : "Load more items"}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ================================================= */}
        {/* RIGHT COLUMN: CURRENT ORDER & BILL SUMMARY */}
        {/* ================================================= */}
        <aside className="hidden lg:flex w-80 shrink-0 flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sm:w-96 lg:w-[410px]">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-slate-800 dark:text-slate-200" />
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">Current Order</h2>
              <span className="rounded-full bg-teal-100 dark:bg-teal-950/70 px-2 py-0.5 text-[10px] font-black text-teal-800 dark:text-teal-300">
                {totalItemsCount} items
              </span>
            </div>

            {cart.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setHoldNoteInput("");
                    setIsHoldConfirmModalOpen(true);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-2xs"
                  title="Hold this order"
                >
                  <PauseCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Hold</span>
                </button>

                <button
                  type="button"
                  onClick={clearCart}
                  className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 ml-1"
                  title="Clear current cart"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            )}
          </div>

          {/* Customer Selection Bar */}
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3">
            <div
              className="relative flex-1"
              onBlur={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null
                  )
                ) {
                  setIsCustomerDropdownOpen(false);
                  setCustomerSearch("");
                }
              }}
            >
              <UserRound className="absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />

              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setIsCustomerDropdownOpen(true);
                }}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                placeholder={selectedCustomerName}
                autoComplete="off"
                className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-8 pr-8 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none transition placeholder:text-slate-700 dark:placeholder:text-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900/40"
              />

              {customerSearch ? (
                <button
                  type="button"
                  onClick={() => setCustomerSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              )}

              {isCustomerDropdownOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 shadow-xl">

                  {/* Walk-in Customer */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleCustomerSelect(null)}
                    className={`w-full px-3 py-2 text-left text-xs transition hover:bg-teal-50 dark:hover:bg-slate-700 ${selectedCustomerId === null
                      ? "bg-teal-50 dark:bg-teal-950/60 font-bold text-teal-700 dark:text-teal-300"
                      : "text-slate-700 dark:text-slate-200"
                      }`}
                  >
                    Walk-in Customer
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                  {/* Filtered Customers */}
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleCustomerSelect(customer.id)}
                        className={`w-full px-3 py-2 text-left text-xs transition hover:bg-teal-50 dark:hover:bg-slate-700 ${selectedCustomerId === customer.id
                          ? "bg-teal-50 dark:bg-teal-950/60 font-bold text-teal-700 dark:text-teal-300"
                          : "text-slate-700 dark:text-slate-200"
                          }`}
                      >
                        <span className="block font-semibold">
                          {customer.name}
                        </span>

                        <span className="mt-0.5 block text-[10px] text-slate-400 dark:text-slate-500">
                          {customer.code}
                          {customer.phone ? ` • ${customer.phone}` : ""}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                      No customers found
                    </p>
                  )}
                  {customersHasMore && (
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => void loadCustomers(customerSearch, customersPage + 1, true)}
                      disabled={loadingMoreCustomers}
                      className="w-full border-t border-slate-100 dark:border-slate-700 px-3 py-2 text-xs font-bold text-teal-700 dark:text-teal-300 disabled:opacity-50"
                    >
                      {loadingMoreCustomers ? "Loading…" : "Load more customers"}
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsNewCustomerModalOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 dark:hover:text-teal-300"
              title="Add New Customer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600">
                  <ShoppingCart className="h-7 w-7" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Cart is empty
                </h3>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-[200px]">
                  Select products from any category to build the customer&apos;s bill.
                </p>
              </div>
            ) : (
              cart.map((item, index) => {
                const itemKey = `${item.type}-${item.id}`;
                const isEditingThisPrice = editingPriceKey === itemKey;

                return (
                  <div
                    key={itemKey}
                    className={`p-3.5 transition-colors ${index % 2 === 0
                      ? "bg-white dark:bg-slate-900/40"
                      : "bg-teal-50/60 dark:bg-teal-950/25"
                      } hover:bg-teal-100/70 dark:hover:bg-teal-900/40`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                            {item.name}
                          </p>

                          {item.brand?.trim() && (
                            <p className="mt-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                              Brand: {item.brand}
                            </p>
                          )}
                        </div>
                        {/* Warranty Selector */}
                        {item.type === "PRODUCT" &&
                          item.warrantyEnabled && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <ShieldCheck
                                className={`h-3.5 w-3.5 shrink-0 ${(item.warrantyMonths ?? 0) > 0
                                  ? "text-teal-600 dark:text-teal-400"
                                  : "text-slate-400 dark:text-slate-500"
                                  }`}
                              />
                              <select
                                value={item.warrantyMonths ?? 0}
                                onChange={(e) =>
                                  updateItemWarranty(item, Number(e.target.value))
                                }
                                className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold outline-none cursor-pointer transition ${(item.warrantyMonths ?? 0) > 0
                                  ? "border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-extrabold"
                                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
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
                        className="text-slate-300 dark:text-slate-600 transition hover:text-rose-500 dark:hover:text-rose-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Unit Price, Quantity & Line Total */}
                    <div className="mt-2.5 flex w-full min-w-0 flex-nowrap items-center justify-between gap-1.5">
                      {isEditingThisPrice ? (
                        <div className="flex min-w-0 shrink items-center gap-1">
                          <span className="shrink-0 text-[10px] font-bold text-slate-500 dark:text-slate-400">Rs.</span>
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
                            className="h-7 w-16 min-w-0 rounded border border-teal-400 dark:border-teal-500 bg-white dark:bg-slate-800 px-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSavePrice(item)}
                            className="rounded bg-teal-600 px-1.5 py-1 text-[9px] font-bold text-white hover:bg-teal-700"
                            aria-label="Save item price"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPriceKey(null)}
                            className="rounded bg-slate-200 dark:bg-slate-700 p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                            aria-label="Cancel price edit"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openPriceEditModal(item)}
                          className="inline-flex min-w-0 shrink items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 transition shadow-2xs sm:gap-1.5 sm:px-2 sm:text-xs"
                          title="Click to edit unit price for this product"
                        >
                          <span className={`truncate ${item.originalPrice !== undefined && item.price !== item.originalPrice ? "text-teal-700 dark:text-teal-400 font-black" : ""}`}>
                            {formatRs(item.price)}
                          </span>
                          <span className="hidden shrink-0 text-[10px] font-normal text-slate-400 dark:text-slate-500 sm:inline">/ {item.unit}</span>
                          <Pencil className="h-2.5 w-2.5 shrink-0 text-teal-600 dark:text-teal-400" />
                        </button>
                      )}

                      <div className="flex shrink-0 items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item)}
                          className="flex h-7 w-6 items-center justify-center text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 sm:w-7"
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
                          className="h-7 w-9 border-x border-slate-200 dark:border-slate-700 bg-transparent text-center text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none sm:w-12"
                        />

                        <button
                          type="button"
                          onClick={() => increaseQuantity(item)}
                          className="flex h-7 w-6 items-center justify-center text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 sm:w-7"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <p className="shrink-0 whitespace-nowrap text-[11px] font-black text-slate-900 dark:text-slate-100 sm:text-xs">
                        {formatRs(item.price * item.quantity)}
                      </p>
                    </div>

                    {item.originalPrice !== undefined && item.price !== item.originalPrice && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[10px] line-through text-slate-400 dark:text-slate-500">{formatRs(item.originalPrice)}</span>
                        <span className="rounded bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 text-[9px] font-black text-amber-800 dark:text-amber-300">
                          Custom Price
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ================================================= */}
          {/* CART BILL TOTALS & CHECKOUT BUTTON */}
          {/* ================================================= */}
          <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 p-4">
            {/* Discount Input */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Discount (Rs.)
              </span>
              <div className="relative w-32">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 dark:text-slate-500">
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  max={subtotal + taxTotal}
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder="0.00"
                  className="h-8 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-7 pr-2 text-right text-xs font-bold text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Price Calculations */}
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatRs(subtotal)}
                </span>
              </div>

              {taxTotal > 0 && (
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatRs(taxTotal)}
                  </span>
                </div>
              )}

              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                  <span>Discount</span>
                  <span>- {formatRs(discountAmount)}</span>
                </div>
              )}

              <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-2" />

              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Total Payable
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {formatRs(total)}
                </span>
              </div>
            </div>

            {/* Complete Payment Button */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={openPaymentModal}
              className="mt-4 flex h-12 w-full items-center justify-between rounded-xl bg-teal-600 px-4 text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:shadow-none"
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-sm">
              <ShoppingCart className="h-5 w-5" />
              {totalItemsCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-[10px] font-black text-white">
                  {totalItemsCount}
                </span>
              )}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {totalItemsCount} item{totalItemsCount === 1 ? "" : "s"}
              </div>
              <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                {formatRs(total)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="flex h-10 items-center gap-2 rounded-xl bg-teal-600 px-4 text-xs font-black text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 active:scale-95"
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
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative flex h-full w-full max-w-md flex-col bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-right">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-slate-800 dark:text-slate-200" />
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">Current Order</h2>
                <span className="rounded-full bg-teal-100 dark:bg-teal-950/70 px-2 py-0.5 text-[10px] font-black text-teal-800 dark:text-teal-300">
                  {totalItemsCount} items
                </span>
              </div>

              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 mr-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Customer Selection Bar */}
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3">
              <div className="relative flex-1">
                <UserRound className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <select
                  value={selectedCustomerId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedCustomerId(val ? Number(val) : null);
                  }}
                  className="h-9 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-8 pr-7 text-xs font-semibold text-slate-700 dark:text-slate-200 transition focus:border-teal-500 focus:outline-none"
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
                className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 dark:hover:text-teal-300"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>New</span>
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600">
                    <ShoppingCart className="h-7 w-7" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">Cart is empty</h3>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-[200px]">
                    Select products from any category to build the customer&apos;s bill.
                  </p>
                </div>
              ) : (
                cart.map((item, index) => {
                  const itemKey = `${item.type}-${item.id}`;
                  const isEditingThisPrice = editingPriceKey === itemKey;

                  return (
                    <div
                      key={itemKey}
                      className={`p-3.5 transition-colors ${index % 2 === 0
                        ? "bg-white dark:bg-slate-900/40"
                        : "bg-teal-50/60 dark:bg-teal-950/25"
                        } hover:bg-teal-100/70 dark:hover:bg-teal-900/40`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                              {item.name}
                            </p>

                            {item.brand?.trim() && (
                              <p className="mt-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                Brand: {item.brand}
                              </p>
                            )}
                          </div>

                          {/* Editable unit price */}
                          {isEditingThisPrice ? (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Rs.</span>
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
                                className="h-6 w-20 rounded border border-teal-400 dark:border-teal-500 bg-white dark:bg-slate-800 px-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSavePrice(item)}
                                className="rounded bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-teal-700"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPriceKey(null)}
                                className="rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openPriceEditModal(item)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 transition shadow-2xs"
                                title="Click to edit unit price for this product"
                              >
                                <span className={item.originalPrice !== undefined && item.price !== item.originalPrice ? "text-teal-700 dark:text-teal-400 font-black" : ""}>
                                  {formatRs(item.price)}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">/ {item.unit}</span>
                                <Pencil className="h-2.5 w-2.5 text-teal-600 dark:text-teal-400" />
                              </button>

                              {item.originalPrice !== undefined && item.price !== item.originalPrice ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] line-through text-slate-400 dark:text-slate-500">{formatRs(item.originalPrice)}</span>
                                  <span className="rounded bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 text-[9px] font-black text-amber-800 dark:text-amber-300">
                                    Custom Price
                                  </span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openPriceEditModal(item)}
                                  className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-950/60 transition"
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
                                    ? "text-teal-600 dark:text-teal-400"
                                    : "text-slate-400 dark:text-slate-500"
                                    }`}
                                />
                                <select
                                  value={item.warrantyMonths ?? 0}
                                  onChange={(e) =>
                                    updateItemWarranty(item, Number(e.target.value))
                                  }
                                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold outline-none cursor-pointer transition ${(item.warrantyMonths ?? 0) > 0
                                    ? "border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-extrabold"
                                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
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
                          className="text-slate-300 dark:text-slate-600 transition hover:text-rose-500 dark:hover:text-rose-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Quantity Stepper & Line Total */}
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(item)}
                            className="flex h-7 w-7 items-center justify-center text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700"
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
                            className="h-7 w-12 border-x border-slate-200 dark:border-slate-700 bg-transparent text-center text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => increaseQuantity(item)}
                            className="flex h-7 w-7 items-center justify-center text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                          {formatRs(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Totals & Checkout Button */}
            <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Discount (Rs.)</span>
                <div className="relative w-32">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 dark:text-slate-500">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal + taxTotal}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    placeholder="0.00"
                    className="h-8 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-7 pr-2 text-right text-xs font-bold text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRs(subtotal)}</span>
                </div>
                {taxTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRs(taxTotal)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                    <span>Discount</span>
                    <span>- {formatRs(discountAmount)}</span>
                  </div>
                )}
                <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-1.5" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100">Total Payable</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{formatRs(total)}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={openPaymentModal}
                className="mt-3.5 flex h-12 w-full items-center justify-between rounded-xl bg-teal-600 px-4 text-white shadow-lg shadow-teal-600/25 hover:bg-teal-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
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

              {/* Hold Order & Held Orders in Mobile Drawer */}
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={() => {
                    setHoldNoteInput("");
                    setIsHoldConfirmModalOpen(true);
                  }}
                  className="flex h-9.5 flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-xs font-bold text-amber-800 dark:text-amber-300 transition hover:bg-amber-100 dark:hover:bg-amber-900/60 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PauseCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Hold Order</span>
                </button>

                {heldCarts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsHeldCartsModalOpen(true)}
                    className="flex h-9.5 items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-98"
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Held ({heldCarts.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* 3. PAYMENT MODAL (FULLY RESPONSIVE WITH FIXED FOOTER) */}
      {/* ================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/75 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative flex flex-col w-full max-w-lg max-h-[90dvh] sm:max-h-[85vh] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden my-auto overscroll-contain border border-slate-100 dark:border-slate-800">
            {/* Modal Fixed Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-white dark:bg-slate-900">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Process Payment & Bill
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Select payment method and confirm tender amount
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Total Display */}
              <div className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 p-4 text-white shadow-inner border border-slate-800">
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
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-teal-400">
                      {totalItemsCount} items
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-slate-300 border-t border-white/10 pt-1.5 truncate">
                  Customer:{" "}
                  {selectedCustomerName}
                </p>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Payment Method
                </label>
                <div className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-none">
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
                        onClick={() => {
                          const nextMethod = pm.id as PaymentMethodType;
                          setPaymentMethod(nextMethod);
                          if (nextMethod === "CREDIT") {
                            setCashTenderedInput("0");
                          } else if (paymentMethod === "CREDIT" && cashTendered === 0) {
                            setCashTenderedInput(total.toString());
                          }
                        }}
                        className={`flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-2 py-2 text-[10px] font-bold transition sm:text-[11px] ${isSelected
                          ? "border-teal-600 dark:border-teal-500 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 ring-2 ring-teal-500/20"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750"
                          }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Paid Now & Change / Remaining Credit Calculation */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {paymentMethod === "CASH"
                      ? "Cash Received Now (Rs.)"
                      : paymentMethod === "CREDIT"
                        ? "Advance / Partial Cash Paid Now (Rs.)"
                        : "Amount Paid Now (Rs.)"}
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {paymentMethod === "CREDIT"
                      ? "Enter 0 for full credit, or partial amount paid"
                      : "Enter less than total for partial credit"}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={cashTenderedInput}
                    onChange={(e) => setCashTenderedInput(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 text-base font-black text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>

                {/* Change or Remaining Credit Due Display */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5 space-y-2">
                  {cashTendered >= total ? (
                    <div className="flex items-center justify-between rounded-xl bg-teal-100/70 dark:bg-teal-950/60 px-3 py-2 text-teal-900 dark:text-teal-200">
                      <span className="text-xs font-bold">
                        {paymentMethod === "CASH" ? "Change to Return:" : "Full Amount Paid:"}
                      </span>
                      <span className="text-base font-black">
                        {formatRs(paymentMethod === "CASH" ? changeAmount : total)}
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-amber-100/80 dark:bg-amber-950/60 px-3 py-2 text-amber-950 dark:text-amber-200 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">Paid Now:</span>
                        <span className="font-bold text-teal-800 dark:text-teal-300">{formatRs(paidNowAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-t border-amber-200/80 dark:border-amber-800/60 pt-1">
                        <span className="font-bold">Remaining Due (Customer Credit):</span>
                        <span className="text-sm font-black text-rose-700 dark:text-rose-400">
                          {formatRs(remainingBalanceAmount)}
                        </span>
                      </div>
                    </div>
                  )}

                  {remainingBalanceAmount > 0 && !selectedCustomerId && (
                    <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/60 px-3 py-2 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                      ⚠️ Please select a registered Customer (top right of cart) to record a Credit or Partial payment bill.
                    </div>
                  )}
                </div>
              </div>

              {paymentMethod !== "CASH" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Transaction Reference / ID
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. Card approval code or Bank slip no"
                    className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Optional Order / Payment Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Bill Note (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. WhatsApp document sent, Urgent job"
                  className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-white focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Fixed Footer - Always Visible */}
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 px-5 py-3.5 flex items-center gap-3 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                disabled={processingPayment}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={
                  processingPayment ||
                  (remainingBalanceAmount > 0 && !selectedCustomerId)
                }
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white shadow-md shadow-teal-600/25 hover:bg-teal-700 active:scale-[0.99] disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:shadow-none transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/75 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative flex flex-col w-full max-w-lg max-h-[90dvh] sm:max-h-[85vh] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden my-auto overscroll-contain border border-slate-100 dark:border-slate-800">
            {/* Header / Success Indicator */}
            <div className="shrink-0 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-black uppercase tracking-wide">
                  Bill Generated Successfully
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsBillModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Bill Receipt Preview Scrollable Container */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 sm:p-5 font-mono text-xs text-slate-800 dark:text-slate-200 shadow-sm">
                {/* Store Header */}
                <div className="text-center">
                  <h4 className="text-base font-black tracking-wider text-slate-900 dark:text-white">
                    PUBUDU CREATIVE HUB
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Printing • Designing • Stationery • Mobile Accessories
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    No. 45, Main Street, Colombo, Sri Lanka
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Tel: +94 77 123 4567 | WhatsApp: 071 987 6543
                  </p>
                </div>

                <div className="my-3 border-t border-dashed border-slate-300 dark:border-slate-800" />

                {/* Bill Meta */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Invoice No:</span>
                    <span className="font-bold">{lastCompletedBill.invoiceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Date & Time:</span>
                    <span>
                      {lastCompletedBill.date} {lastCompletedBill.time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Customer:</span>
                    <span className="font-bold">{lastCompletedBill.customerName}</span>
                  </div>
                  {lastCompletedBill.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Phone:</span>
                      <span>{lastCompletedBill.customerPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Payment:</span>
                    <span className="font-bold">{lastCompletedBill.paymentMethod}</span>
                  </div>
                </div>

                <div className="my-3 border-t border-dashed border-slate-300 dark:border-slate-800" />

                {/* Items Table */}
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-1 text-left">Item</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Price</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {lastCompletedBill.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 pr-2">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{it.name}</div>
                          <div className="text-[9px] text-slate-400 dark:text-slate-500">
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

                <div className="my-3 border-t border-dashed border-slate-300 dark:border-slate-800" />

                {/* Totals */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatRs(lastCompletedBill.subtotal)}</span>
                  </div>
                  {lastCompletedBill.discount > 0 && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400">
                      <span>Discount</span>
                      <span>- {formatRs(lastCompletedBill.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-300 dark:border-slate-800 pt-1.5 text-sm font-black text-slate-900 dark:text-white">
                    <span>NET TOTAL</span>
                    <span>{formatRs(lastCompletedBill.total)}</span>
                  </div>
                  {lastCompletedBill.balanceAmount > 0 ? (
                    <>
                      <div className="flex justify-between pt-1 text-slate-700 dark:text-slate-300">
                        <span>Paid Amount</span>
                        <span className="font-bold text-teal-700 dark:text-teal-400">{formatRs(lastCompletedBill.paidAmount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-rose-600 dark:text-rose-400">
                        <span>Balance Due (Credit)</span>
                        <span>{formatRs(lastCompletedBill.balanceAmount)}</span>
                      </div>
                    </>
                  ) : lastCompletedBill.paymentMethod === "CASH" ? (
                    <>
                      <div className="flex justify-between pt-1 text-slate-600 dark:text-slate-400">
                        <span>Cash Tendered</span>
                        <span>{formatRs(lastCompletedBill.cashTendered)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-teal-700 dark:text-teal-400">
                        <span>Change Returned</span>
                        <span>{formatRs(lastCompletedBill.changeAmount)}</span>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="my-3 border-t border-dashed border-slate-300 dark:border-slate-800" />

                {/* Warranties Issued */}
                {lastCompletedBill.warranties && lastCompletedBill.warranties.length > 0 && (
                  <div className="mb-3 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50/90 dark:bg-teal-950/60 p-3 text-xs text-teal-950 dark:text-teal-200">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 mb-1.5 text-[11px]">
                      <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      Official Warranty Certificates ({lastCompletedBill.warranties.length})
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      {lastCompletedBill.warranties.map((w, idx) => (
                        <div key={idx} className="rounded-lg bg-white/90 dark:bg-slate-900/90 p-2 border border-teal-200 dark:border-teal-800 shadow-2xs">
                          <div className="flex items-center justify-between font-mono font-bold text-teal-700 dark:text-teal-400">
                            <span>{w.warrantyCode}</span>
                            <span className="rounded bg-teal-100 dark:bg-teal-950 px-1.5 py-0.2 text-[10px] text-teal-800 dark:text-teal-300">
                              {w.durationMonths} Months
                            </span>
                          </div>
                          <div className="text-slate-800 dark:text-slate-200 truncate text-xs font-semibold mt-0.5">
                            {w.productName}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
                            Valid Until: <strong className="text-slate-700 dark:text-slate-200">{w.expiryDate}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bill Footer Note */}
                <div className="text-center text-[10px] text-slate-500 dark:text-slate-400">
                  <p>*** Thank You for Your Business! ***</p>
                  <p>Pubudu Creative Hub • Colombo, Sri Lanka</p>
                </div>
              </div>
            </div>

            {/* Print & Action Buttons Fixed Footer */}
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 px-5 py-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => printBill("thermal")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm transition hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Printer className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Thermal (80mm)</span>
              </button>

              <button
                type="button"
                onClick={() => printBill("a4")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm transition hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>A4 Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsBillModalOpen(false);
                  clearCart();
                }}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white shadow-md shadow-teal-600/20 transition hover:bg-teal-700"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/75 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleCreateCustomer}
            className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-100 dark:border-slate-800"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Quick Add Customer
              </h3>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Kasun Fernando"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-semibold text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 0771234567"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-semibold text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCustomer}
                className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white hover:bg-teal-700 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/75 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative flex flex-col w-full max-w-md max-h-[90dvh] sm:max-h-[85vh] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden my-auto overscroll-contain border border-slate-100 dark:border-slate-800">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Edit Unit Selling Price (Rs.)
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Custom rate for this sale transaction
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPriceEditModalItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Product Info Card */}
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-white dark:bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
                    {priceEditModalItem.item.category}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {priceEditModalItem.item.code}
                  </span>
                </div>
                <h4 className="mt-1.5 text-sm font-extrabold text-slate-900 dark:text-white">
                  {priceEditModalItem.item.name}
                </h4>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Catalog Base Price:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatRs(priceEditModalItem.originalPrice)}
                  </span>
                  <span>per {priceEditModalItem.item.unit}</span>
                </div>
              </div>

              {/* New Price Input Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  New Unit Price for this Customer (Rs.)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 dark:text-slate-500">
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
                    className="h-12 w-full rounded-xl border-2 border-teal-500/50 bg-white dark:bg-slate-950 pl-10 pr-4 text-xl font-black text-slate-900 dark:text-white shadow-inner focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-500/10"
                  />
                </div>
              </div>

              {/* Quick Preset Discount & Price Adjustment Buttons */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Quick Adjustments &amp; Discounts
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPriceModalInputValue(priceEditModalItem.originalPrice.toString())}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs"
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
                        className="rounded-lg border border-teal-200 dark:border-teal-800/70 bg-teal-50/70 dark:bg-teal-950/60 px-2 py-1 text-xs font-bold text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 shadow-2xs"
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
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs"
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
                    className="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/60 px-2 py-1 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 shadow-2xs"
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
                    ? "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    : diff < 0
                      ? "bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300"
                      : "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
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
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 p-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setPriceEditModalItem(null)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyModalPrice}
                className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white hover:bg-teal-700 shadow-md shadow-teal-600/20 active:scale-[0.99] transition"
              >
                Apply Custom Price
              </button>
            </div>
          </div>
        </div>
      )}

      <POSCalculator
        open={isCalculatorOpen}
        display={calculatorDisplay}
        onClose={() => setIsCalculatorOpen(false)}
        onDigit={handleCalculatorDigit}
        onDecimal={handleCalculatorDecimal}
        onOperator={handleCalculatorOperator}
        onEquals={handleCalculatorEquals}
        onClear={handleCalculatorClear}
        onBackspace={handleCalculatorBackspace}
      />

      {/* ========================================================= */}
      {/* HOLD ORDER CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {isHoldConfirmModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  <PauseCircle className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Hold current order</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Save this cart and start a new order</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsHoldConfirmModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Close hold dialog">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                <div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">Items</span><strong className="text-slate-900 dark:text-white">{totalItemsCount}</strong></div>
                <div className="mt-2 flex justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">Customer</span><strong className="max-w-[65%] truncate text-right text-slate-900 dark:text-white">{selectedCustomerName || "Walk-in Customer"}</strong></div>
                <div className="mt-2 flex justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">Order total</span><strong className="text-base text-teal-700 dark:text-teal-300">{formatRs(total)}</strong></div>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Note (optional)</span>
                <input value={holdNoteInput} onChange={(event) => setHoldNoteInput(event.target.value)} maxLength={120} autoFocus placeholder="e.g. Customer will come back" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-amber-950" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
              <button type="button" onClick={() => setIsHoldConfirmModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
              <button type="button" onClick={() => handleHoldCurrentCart()} disabled={cart.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50">
                <PauseCircle className="h-4 w-4" /> Hold order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* HELD ORDERS LIST MODAL */}
      {/* ========================================================= */}
      {isHeldCartsModalOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsHeldCartsModalOpen(false); }}>
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"><Clock className="h-5 w-5" /></span>
                <div><h3 className="text-base font-black text-slate-900 dark:text-white">Held Orders</h3><p className="text-xs text-slate-500 dark:text-slate-400">{heldCarts.length} order{heldCarts.length === 1 ? "" : "s"} saved on this device</p></div>
              </div>
              <button type="button" onClick={() => setIsHeldCartsModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Close held orders"><X className="h-5 w-5" /></button>
            </div>
            <div className="border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={heldCartSearch} onChange={(event) => setHeldCartSearch(event.target.value)} placeholder="Search by order number, customer, note or item..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></div>
                {heldCarts.length > 0 && <button type="button" onClick={handleClearAllHeldCarts} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/30"><Trash2 className="h-3.5 w-3.5" /> Clear all</button>}
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-950/30">
              {filteredHeldCarts.length === 0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-5 text-center dark:border-slate-700 dark:bg-slate-900">
                  <Clock className="mb-3 h-9 w-9 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{heldCarts.length === 0 ? "No held orders yet" : "No matching orders"}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{heldCarts.length === 0 ? "Use the Hold button in the current order panel to save an order." : "Try another search term."}</p>
                </div>
              ) : filteredHeldCarts.map((held) => (
                <div key={held.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-black text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Order #{held.holdNumber}</span><span className="text-xs text-slate-400">{Number.isNaN(new Date(held.heldAt).getTime()) ? "Date unavailable" : new Date(held.heldAt).toLocaleString()}</span></div>
                      <p className="mt-2 truncate text-sm font-black text-slate-900 dark:text-white">{held.selectedCustomerName || "Walk-in Customer"}</p>
                      {held.note && <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">{held.note}</p>}
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{held.itemsCount} item{held.itemsCount === 1 ? "" : "s"} · {held.cart.slice(0, 3).map((item) => `${item.name} × ${item.quantity}`).join(", ")}{held.cart.length > 3 ? ` +${held.cart.length - 3} more` : ""}</p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end"><strong className="text-base font-black text-teal-700 dark:text-teal-300">{formatRs(held.total)}</strong><div className="flex items-center gap-2"><button type="button" onClick={() => handleDeleteHeldCart(held.id)} className="rounded-lg border border-rose-200 p-2 text-rose-500 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/30" title="Delete held order" aria-label={`Delete order ${held.holdNumber}`}><Trash2 className="h-4 w-4" /></button><button type="button" onClick={() => handleResumeCart(held)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-black text-white hover:bg-teal-700"><PlayCircle className="h-4 w-4" /> Resume</button></div></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-800"><p className="text-[11px] text-slate-400">Held orders are stored in this browser on this device.</p><button type="button" onClick={() => setIsHeldCartsModalOpen(false)} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600">Close</button></div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* RESUME CONFLICT CONFIRMATION */}
      {/* ========================================================= */}
      {pendingResumeHeldCart && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"><AlertCircle className="h-5 w-5" /></span><div><h3 className="text-base font-black text-slate-900 dark:text-white">Current order is not empty</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose what to do with the current cart before resuming Order #{pendingResumeHeldCart.holdNumber}.</p></div></div>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/70"><div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Current cart</span><strong className="text-slate-900 dark:text-white">{totalItemsCount} items · {formatRs(total)}</strong></div><div className="mt-2 flex justify-between"><span className="text-slate-500 dark:text-slate-400">Held order</span><strong className="text-slate-900 dark:text-white">{pendingResumeHeldCart.itemsCount} items · {formatRs(pendingResumeHeldCart.total)}</strong></div></div>
            <div className="mt-5 grid gap-2">
              <button type="button" onClick={() => handleResumeCart(pendingResumeHeldCart, "SWAP")} className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-left text-sm font-black text-teal-800 hover:bg-teal-100 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-300 dark:hover:bg-teal-950/60"><span><span className="block">Swap orders</span><span className="mt-0.5 block text-xs font-medium opacity-75">Save the current cart as a held order, then resume the selected one.</span></span><ArrowRight className="h-5 w-5 shrink-0" /></button>
              <button type="button" onClick={() => handleResumeCart(pendingResumeHeldCart, "OVERWRITE")} className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm font-black text-rose-800 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/60"><span><span className="block">Replace current cart</span><span className="mt-0.5 block text-xs font-medium opacity-75">Discard the current cart and load the selected held order.</span></span><ArrowRight className="h-5 w-5 shrink-0" /></button>
              <button type="button" onClick={() => setPendingResumeHeldCart(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Counter Modal */}
      {canAccessPDFCounter && isPDFCounterOpen && (
        <PDFCounterModal
          services={items.filter((item) => item.type === "SERVICE")}
          onClose={() => setIsPDFCounterOpen(false)}
          onAddToCart={addPDFCounterServicesToCart}
        />
      )}
    </div>
  );
}
