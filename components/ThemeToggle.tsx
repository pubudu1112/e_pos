"use client";

import {
  Check,
  Laptop,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"
        aria-label="Change theme"
      >
        <Sun className="h-4 w-4" />
      </button>
    );
  }

  const options = [
    {
      value: "light",
      label: "Light",
      icon: Sun,
    },
    {
      value: "dark",
      label: "Dark",
      icon: Moon,
    },
    {
      value: "system",
      label: "System",
      icon: Laptop,
    },
  ];

  return (
    <div className="relative group">

      {/* ================================================= */}
      {/* THEME BUTTON */}
      {/* ================================================= */}

      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:border-primary/30 hover:bg-accent hover:text-primary"
        aria-label="Change theme"
      >

        {theme === "dark" ? (
          <Moon className="h-4 w-4" />
        ) : theme === "light" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Laptop className="h-4 w-4" />
        )}

      </button>

      {/* ================================================= */}
      {/* THEME MENU */}
      {/* ================================================= */}

      <div className="invisible absolute right-0 top-12 z-50 w-44 translate-y-1 rounded-xl border border-border bg-card p-1.5 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">

        <div className="px-2.5 py-2">

          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Appearance
          </p>

        </div>

        {options.map((option) => {
          const Icon = option.icon;

          const active =
            theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                setTheme(option.value)
              }
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-accent"
              }`}
            >

              <Icon className="h-4 w-4 shrink-0" />

              <span className="flex-1">
                {option.label}
              </span>

              {active && (
                <Check className="h-3.5 w-3.5" />
              )}

            </button>
          );
        })}

      </div>

    </div>
  );
}