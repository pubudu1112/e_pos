
"use client";

import { useEffect, useRef, useState } from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);

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
                  placeholder="Search products, sales, customers..."
                  className="
                    h-10 w-full rounded-xl border border-input
                    bg-muted/40 pl-10 pr-4 text-sm text-foreground
                    outline-none placeholder:text-muted-foreground
                    transition focus:border-primary focus:bg-background
                    focus:ring-2 focus:ring-primary/10
                  "
                />
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
