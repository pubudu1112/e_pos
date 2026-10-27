"use client";

import { useState } from "react";
import { ChevronDown, Menu, Search, Store } from "lucide-react";
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
          <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-sidebar shadow-2xl flex flex-col">
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

        <div className="min-w-0 flex-1">
          {/* DESKTOP TOP NAVBAR */}
          <header className="sticky top-0 z-30 hidden h-20 border-b border-border bg-background/95 backdrop-blur lg:flex">
            <div className="flex w-full items-center justify-between px-6">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search products, sales, customers..."
                  className="
                    h-10
                    w-full
                    rounded-xl
                    border
                    border-input
                    bg-muted/40
                    pl-10
                    pr-4
                    text-sm
                    text-foreground
                    outline-none
                    placeholder:text-muted-foreground
                    transition
                    focus:border-primary
                    focus:bg-background
                    focus:ring-2
                    focus:ring-primary/10
                  "
                />
              </div>

              <div className="ml-6 flex items-center gap-3">
                <ThemeToggle />
                <NotificationBell />
                <div className="mx-1 h-8 w-px bg-border" />

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden xl:block">
                    <p className="text-sm font-semibold leading-5 text-foreground">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.role.name}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
