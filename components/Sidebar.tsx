"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileBarChart,
  FileText,
  FolderTree,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Percent,
  Receipt,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  History,
  Users,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type SidebarProps = {
  logoutAction: () => Promise<void>;
  userRole?: string;
  isMobileDrawer?: boolean;
  onCloseMobile?: () => void;
};

type MenuItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  permission: string;
};

type MenuGroup = {
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
};

/* ============================================================
   MAIN MENU
============================================================ */

const mainMenu: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "DASHBOARD_VIEW",
  },
  {
    label: "POS",
    href: "/pos",
    icon: ShoppingCart,
    permission: "POS_VIEW",
  },
  {
    label: "Jobs",
    href: "/jobs",
    icon: BriefcaseBusiness,
    permission: "JOB_VIEW",
  },
];

/* ============================================================
   PRODUCTS
============================================================ */

const productMenu: MenuGroup = {
  label: "Products",
  icon: Package,

  items: [
    {
      label: "Products",
      href: "/products",
      icon: Package,
      permission: "PRODUCT_VIEW",
    },
    {
      label: "Categories",
      href: "/products/categories",
      icon: Tags,
      permission: "CATEGORY_VIEW",
    },
    {
      label: "Brands",
      href: "/products/brands",
      icon: Store,
      permission: "BRAND_VIEW",
    },
    {
      label: "Units",
      href: "/products/units",
      icon: Tags,
      permission: "UNIT_VIEW",
    },
    {
      label: "Taxes",
      href: "/taxes",
      icon: Percent,
      permission: "TAX_VIEW",
    },
    {
      label: "Services",
      href: "/services",
      icon: Wrench,
      permission: "SERVICE_VIEW",
    },
    {
      label: "Service Categories",
      href: "/products/service-categories",
      icon: FolderTree,
      permission: "SERVICE_CATEGORY_VIEW",
    },
  ],
};

/* ============================================================
   INVENTORY
============================================================ */

const inventoryMenu: MenuItem[] = [
  {
    label: "Inventory",
    href: "/inventory",
    icon: Boxes,
    permission: "INVENTORY_VIEW",
  },
  {
    label: "Movement History",
    href: "/inventory/movements",
    icon: History,
    permission: "INVENTORY_VIEW_MOVEMENTS",
  },
  {
    label: "Purchases",
    href: "/purchases",
    icon: Truck,
    permission: "PURCHASE_VIEW",
  },
];

/* ============================================================
   BUSINESS
============================================================ */

const businessMenu: MenuItem[] = [
  {
    label: "Sales",
    href: "/sales",
    icon: Receipt,
    permission: "SALE_VIEW",
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
    permission: "CUSTOMER_VIEW",
  },
  {
    label: "Suppliers",
    href: "/suppliers",
    icon: Truck,
    permission: "SUPPLIER_VIEW",
  },
  {
    label: "Expenses",
    href: "/expenses",
    icon: WalletCards,
    permission: "EXPENSE_VIEW",
  },
];

/* ============================================================
   REPORTS
============================================================ */

const reportMenu: MenuGroup = {
  label: "Reports",
  icon: FileBarChart,

  items: [
    {
      label: "Sales Reports",
      href: "/reports/sales",
      icon: BarChart3,
      permission: "REPORT_SALES_VIEW",
    },
    {
      label: "Financial Reports",
      href: "/reports/financial",
      icon: DollarSign,
      permission: "REPORT_FINANCIAL_VIEW",
    },
    {
      label: "Activity Logs",
      href: "/reports/activity",
      icon: FileText,
      permission: "REPORT_ACTIVITY_VIEW",
    },
  ],
};

/* ============================================================
   ACTIVE PATH
============================================================ */

/* ============================================================
   ACTIVE PATH
============================================================ */

function isActivePath(
  pathname: string,
  href: string
) {
  // Dashboard must be exact
  if (href === "/dashboard") {
    return pathname === href;
  }

  // Products must be exact.
  // Otherwise /products/categories,
  // /products/brands, /products/units,
  // /products/service-categories etc.
  // will also activate Products.
  if (href === "/products") {
    return pathname === "/products";
  }

  // All other menu items:
  // exact match OR child route
  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

/* ============================================================
   SIDEBAR
============================================================ */

export default function Sidebar({
  logoutAction,
  userRole,
  isMobileDrawer = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  const [permissions, setPermissions] =
    useState<string[]>([]);

  const [apiIsSuperAdmin, setApiIsSuperAdmin] =
    useState(false);

  const [permissionsLoading, setPermissionsLoading] =
    useState(true);

  const isSuperAdmin = userRole === "SUPER_ADMIN" || apiIsSuperAdmin;

  const [productsOpen, setProductsOpen] =
    useState(
      pathname.startsWith("/products") ||
        pathname.startsWith("/services") ||
        pathname.startsWith("/taxes")
    );

  const [reportsOpen, setReportsOpen] =
    useState(
      pathname.startsWith("/reports")
    );

  /* ==========================================================
     LOAD CURRENT USER PERMISSIONS
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadPermissions() {
      try {
        setPermissionsLoading(true);

        const response = await fetch(
          "/api/auth/permissions",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (
          !response.ok ||
          !result.success ||
          !Array.isArray(result.data)
        ) {
          throw new Error(
            result.message ||
              "Unable to load permissions."
          );
        }

        if (!cancelled) {
          if (result.isSuperAdmin) {
            setApiIsSuperAdmin(true);
          }
          setPermissions(result.data);
        }
      } catch (error) {
        console.error(
          "Sidebar permission loading error:",
          error
        );

        if (!cancelled) {
          setPermissions([]);
        }
      } finally {
        if (!cancelled) {
          setPermissionsLoading(false);
        }
      }
    }

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ==========================================================
     PERMISSION CHECK
  ========================================================== */

  function hasPermission(
    permission: string
  ) {
    if (isSuperAdmin) {
      return true;
    }
    return permissions.includes(permission);
  }

  /* ==========================================================
     FILTER MENU ITEMS
  ========================================================== */

  const visibleMainMenu = useMemo(() => {
    if (isSuperAdmin) {
      return mainMenu;
    }
    return mainMenu.filter((item) =>
      permissions.includes(item.permission)
    );
  }, [permissions, isSuperAdmin]);

  const visibleProductItems = useMemo(() => {
    if (isSuperAdmin) {
      return productMenu.items;
    }
    return productMenu.items.filter((item) =>
      permissions.includes(item.permission)
    );
  }, [permissions, isSuperAdmin]);

  const visibleInventoryItems = useMemo(() => {
    if (isSuperAdmin) {
      return inventoryMenu;
    }
    return inventoryMenu.filter((item) =>
      permissions.includes(item.permission)
    );
  }, [permissions, isSuperAdmin]);

  const visibleBusinessItems = useMemo(() => {
    if (isSuperAdmin) {
      return businessMenu;
    }
    return businessMenu.filter((item) =>
      permissions.includes(item.permission)
    );
  }, [permissions, isSuperAdmin]);

  const visibleReportItems = useMemo(() => {
    if (isSuperAdmin) {
      return reportMenu.items;
    }
    return reportMenu.items.filter((item) =>
      permissions.includes(item.permission)
    );
  }, [permissions, isSuperAdmin]);

  const showProductsGroup =
    visibleProductItems.length > 0;

  const showInventoryGroup =
    visibleInventoryItems.length > 0;

  const showBusinessGroup =
    visibleBusinessItems.length > 0;

  const showReportsGroup =
    visibleReportItems.length > 0;

  const showSettings =
    isSuperAdmin || hasPermission("SETTINGS_VIEW");

  /* ==========================================================
     MENU ITEM
  ========================================================== */

  function renderMenuItem(item: MenuItem) {
    const Icon = item.icon;

    const active = isActivePath(
      pathname,
      item.href
    );

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => {
          if (onCloseMobile) onCloseMobile();
        }}
        className={`
          group
          flex
          items-center
          gap-3
          rounded-xl
          px-3
          py-2.5
          text-sm
          font-medium
          transition-all
          duration-150
          ${
            active
              ? `
                bg-primary
                text-primary-foreground
                shadow-sm
              `
              : `
                text-muted-foreground
                hover:bg-accent
                hover:text-accent-foreground
              `
          }
        `}
      >
        <Icon
          className={`
            h-[18px]
            w-[18px]
            shrink-0
            transition-colors
            ${
              active
                ? "text-primary-foreground"
                : "text-muted-foreground group-hover:text-accent-foreground"
            }
          `}
        />

        <span>{item.label}</span>
      </Link>
    );
  }

  /* ==========================================================
     SETTINGS ACTIVE
  ========================================================== */

  const settingsActive = isActivePath(
    pathname,
    "/settings"
  );

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <aside
      className={
        isMobileDrawer
          ? "flex h-full w-full flex-col bg-sidebar"
          : "hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col"
      }
    >
      {/* ======================================================
          LOGO
      ======================================================= */}

      <div
        className="
          flex
          h-20
          items-center
          justify-between
          border-b
          border-sidebar-border
          px-5
        "
      >
        <Link
          href="/dashboard"
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
          }}
          className="flex items-center gap-3"
        >
          <div
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              bg-sidebar-primary
              shadow-sm
            "
          >
            <Store
              className="
                h-5
                w-5
                text-sidebar-primary-foreground
              "
            />
          </div>

          <div>
            <p
              className="
                text-sm
                font-bold
                tracking-tight
                text-sidebar-foreground
              "
            >
              Pubudu POS
            </p>

            <p
              className="
                text-xs
                text-sidebar-foreground/50
              "
            >
              Creative Hub
            </p>
          </div>
        </Link>

        {isMobileDrawer && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-xl p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ======================================================
          NAVIGATION
      ======================================================= */}

      <div
        className="
          flex-1
          overflow-y-auto
          px-3
          py-5
        "
      >
        {permissionsLoading && !isSuperAdmin ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ==================================================
                MAIN
            =================================================== */}

            {visibleMainMenu.length > 0 && (
              <div className="space-y-1">
                {visibleMainMenu.map(
                  renderMenuItem
                )}
              </div>
            )}

            {/* ==================================================
                PRODUCTS
            =================================================== */}

            {showProductsGroup && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() =>
                    setProductsOpen(
                      (current) => !current
                    )
                  }
                  className="
                    flex
                    w-full
                    items-center
                    justify-between
                    px-3
                    pb-2
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-sidebar-foreground/45
                    transition
                    hover:text-sidebar-foreground/70
                  "
                >
                  <span>Products</span>

                  {productsOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {productsOpen && (
                  <div className="space-y-1">
                    {visibleProductItems.map(
                      renderMenuItem
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ==================================================
                INVENTORY
            =================================================== */}

            {showInventoryGroup && (
              <div className="mt-6">
                <p
                  className="
                    px-3
                    pb-2
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-sidebar-foreground/45
                  "
                >
                  Inventory
                </p>

                <div className="space-y-1">
                  {visibleInventoryItems.map(
                    renderMenuItem
                  )}
                </div>
              </div>
            )}

            {/* ==================================================
                BUSINESS
            =================================================== */}

            {showBusinessGroup && (
              <div className="mt-6">
                <p
                  className="
                    px-3
                    pb-2
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-sidebar-foreground/45
                  "
                >
                  Business
                </p>

                <div className="space-y-1">
                  {visibleBusinessItems.map(
                    renderMenuItem
                  )}
                </div>
              </div>
            )}

            {/* ==================================================
                REPORTS
            =================================================== */}

            {showReportsGroup && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() =>
                    setReportsOpen(
                      (current) => !current
                    )
                  }
                  className="
                    flex
                    w-full
                    items-center
                    justify-between
                    px-3
                    pb-2
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-sidebar-foreground/45
                    transition
                    hover:text-sidebar-foreground/70
                  "
                >
                  <span>Reports</span>

                  {reportsOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {reportsOpen && (
                  <div className="space-y-1">
                    {visibleReportItems.map(
                      renderMenuItem
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ==================================================
                SYSTEM
            =================================================== */}

            {showSettings && (
              <div className="mt-6">
                <p
                  className="
                    px-3
                    pb-2
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-sidebar-foreground/45
                  "
                >
                  System
                </p>

                <Link
                  href="/settings"
                  className={`
                    group
                    flex
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-2.5
                    text-sm
                    font-medium
                    transition-all
                    duration-150
                    ${
                      settingsActive
                        ? `
                          bg-primary
                          text-primary-foreground
                          shadow-sm
                        `
                        : `
                          text-muted-foreground
                          hover:bg-accent
                          hover:text-accent-foreground
                        `
                    }
                  `}
                >
                  <Settings
                    className={`
                      h-[18px]
                      w-[18px]
                      shrink-0
                      ${
                        settingsActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-accent-foreground"
                      }
                    `}
                  />

                  <span>Settings</span>
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* ======================================================
          LOGOUT
      ======================================================= */}

      <div
        className="
          border-t
          border-sidebar-border
          p-3
        "
      >
        <form action={logoutAction}>
          <button
            type="submit"
            className="
              group
              flex
              w-full
              items-center
              gap-3
              rounded-xl
              px-3
              py-2.5
              text-sm
              font-medium
              text-red-600
              transition
              hover:bg-red-500/10
              hover:text-red-600
              dark:text-red-400
              dark:hover:text-red-300
            "
          >
            <LogOut
              className="
                h-[18px]
                w-[18px]
                shrink-0
              "
            />

            <span>Logout</span>
          </button>
        </form>
      </div>
    </aside>
  );
}