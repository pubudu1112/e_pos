
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Menu,
  Search,
  Store,
  LogOut,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";

const APP_SEARCH_LINKS = [
  { label: "Dashboard", href: "/dashboard", permission: "DASHBOARD_VIEW", keywords: "overview" },
  { label: "Point of Sale", href: "/pos", permission: "POS_VIEW", keywords: "billing checkout" },
  { label: "Products", href: "/products", permission: "PRODUCT_VIEW", keywords: "catalog items" },
  { label: "Inventory", href: "/inventory", permission: "INVENTORY_VIEW", keywords: "stock quantity" },
  { label: "Sales", href: "/sales", permission: "SALE_VIEW", keywords: "invoices" },
  { label: "Customers", href: "/customers", permission: "CUSTOMER_VIEW", keywords: "clients credit" },
  { label: "Purchases", href: "/purchases", permission: "PURCHASE_VIEW", keywords: "suppliers stock-in" },
  { label: "Suppliers", href: "/suppliers", permission: "SUPPLIER_VIEW", keywords: "vendor" },
  { label: "Expenses", href: "/expenses", permission: "EXPENSE_VIEW", keywords: "costs" },
  { label: "Jobs", href: "/jobs", permission: "JOB_VIEW", keywords: "printing work orders" },
  { label: "Sales Reports", href: "/reports/sales", permission: "REPORT_SALES_VIEW", keywords: "analytics" },
  { label: "Financial Reports", href: "/reports/financial", permission: "REPORT_FINANCIAL_VIEW", keywords: "profit loss" },
  { label: "Activity Log", href: "/reports/activity", permission: "REPORT_ACTIVITY_VIEW", keywords: "audit history" },
  { label: "General Settings", href: "/settings/general", permission: "SETTINGS_VIEW", keywords: "store configuration" },
];

type AppShellClientProps = {
  user: {
    id: number;
    username: string;
    fullName: string;
    role: {
      id: number;
      name: string;
    };
  };
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
};

export default function AppShellClient({
  user,
  logoutAction,
  children,
}: AppShellClientProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchPermissions, setSearchPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/permissions", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (active && result.success && Array.isArray(result.data)) {
          setSearchPermissions(result.data);
        }
      })
      .catch(() => {
        if (active) setSearchPermissions([]);
      })
      .finally(() => {
        if (active) setPermissionsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const matchingSearchLinks = APP_SEARCH_LINKS.filter((item) => {
    const query = globalSearch.trim().toLowerCase();
    return query && (user.role.name === "SUPER_ADMIN" || searchPermissions.includes(item.permission)) &&
      `${item.label} ${item.keywords}`.toLowerCase().includes(query);
  }).slice(0, 6);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logoutAction();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* =========================================================
          MOBILE TOP BAR
      ========================================================= */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
                <Store className="h-5 w-5 text-primary-foreground" />
              </div>

              <div>
                <span className="text-sm font-bold tracking-tight text-foreground">
                  Pubudu POS
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
      </header>

      {/* =========================================================
          MOBILE DRAWER
      ========================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">

          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-sidebar shadow-2xl">
            <Sidebar
              logoutAction={logoutAction}
              userRole={user.role.name}
              permissions={searchPermissions}
              permissionsLoading={permissionsLoading}
              isMobileDrawer
              onCloseMobile={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* =========================================================
          MAIN APPLICATION
      ========================================================= */}
      <div className="flex min-h-screen">

        {/* DESKTOP SIDEBAR */}
        <Sidebar
          logoutAction={logoutAction}
          userRole={user.role.name}
          permissions={searchPermissions}
          permissionsLoading={permissionsLoading}
        />

        <div className="flex w-full min-w-0 flex-1 flex-col overflow-x-hidden">

          {/* =====================================================
              DESKTOP TOP NAVBAR
          ===================================================== */}
          <header className="sticky top-0 z-30 hidden h-20 border-b border-border bg-background/95 backdrop-blur lg:flex">

            <div className="flex w-full items-center justify-between px-6">

              {/* SEARCH */}
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  type="text"
                  value={globalSearch}
                  onChange={(event) => setGlobalSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && matchingSearchLinks[0]) {
                      router.push(matchingSearchLinks[0].href);
                      setGlobalSearch("");
                    }
                    if (event.key === "Escape") setGlobalSearch("");
                  }}
                  aria-label="Search app sections"
                  aria-expanded={Boolean(globalSearch.trim())}
                  placeholder="Search app sections..."
                  className="
                    h-10 w-full rounded-xl border border-input
                    bg-muted/40 pl-10 pr-4 text-sm text-foreground
                    outline-none placeholder:text-muted-foreground
                    transition focus:border-primary focus:bg-background
                    focus:ring-2 focus:ring-primary/10
                  "
                />
                {globalSearch.trim() && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
                    {matchingSearchLinks.length ? matchingSearchLinks.map((item) => (
                      <button
                        key={item.href}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => { router.push(item.href); setGlobalSearch(""); }}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-accent"
                      >
                        {item.label}
                      </button>
                    )) : (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No matching sections</p>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT ACTIONS */}
              <div className="ml-6 flex items-center gap-3">

                <ThemeToggle />

                <NotificationBell />

                <div className="mx-1 h-8 w-px bg-border" />

                {/* =================================================
                    USER PROFILE DROPDOWN
                ================================================= */}
                <div
                  ref={profileMenuRef}
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setProfileMenuOpen((prev) => !prev)
                    }
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="menu"
                    className="
                      flex items-center gap-3 rounded-xl
                      px-3 py-2 transition-all duration-200
                      hover:bg-accent
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-primary
                    "
                  >
                    {/* AVATAR */}
                    <div className="
                      flex h-12 w-12 shrink-0 items-center
                      justify-center rounded-full bg-primary
                      text-lg font-bold text-primary-foreground
                      shadow-sm
                    ">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>

                    {/* USER DETAILS */}
                    <div className="hidden text-left xl:block">
                      <p className="text-sm font-semibold leading-5 text-foreground">
                        {user.fullName}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {user.role.name}
                      </p>
                    </div>

                    {/* ARROW */}
                    <ChevronDown
                      className={`
                        h-4 w-4 text-muted-foreground
                        transition-transform duration-200
                        ${profileMenuOpen ? "rotate-180" : ""}
                      `}
                    />
                  </button>

                  {/* DROPDOWN MENU */}
                  {profileMenuOpen && (
                    <div
                      role="menu"
                      className="
                        absolute right-0 top-full z-50 mt-3
                        w-64 overflow-hidden rounded-xl
                        border border-border bg-popover
                        shadow-xl
                        animate-in fade-in-0 zoom-in-95
                        duration-150
                      "
                    >
                      {/* LOGOUT */}
                      <div className="p-2">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          className="
                            flex w-full items-center gap-3
                            rounded-lg px-3 py-2.5
                            text-sm font-medium
                            text-red-600
                            transition-colors
                            hover:bg-red-50
                            dark:hover:bg-red-950/30
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-red-500
                          "
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="min-w-0 w-full flex-1 overflow-x-hidden">
            {children}
          </main>

        </div>
      </div>
    </div>
  );
}
