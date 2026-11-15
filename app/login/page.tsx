"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, LogIn, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-slate-100 dark:bg-background flex items-center justify-center px-4 transition-colors">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-card rounded-2xl shadow-xl border border-slate-200 dark:border-border overflow-hidden transition-colors">
          <div className="bg-slate-900 dark:bg-slate-950 px-8 py-8 text-center border-b border-border/20">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-transparent dark:border-border/50">
              <LogIn className="h-8 w-8 text-slate-900 dark:text-emerald-400" />
            </div>

            <h1 className="text-2xl font-bold text-white">
              Pubudu POS
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              Point of Sale & Management System
            </p>
          </div>

          <div className="px-8 py-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-foreground">
                Welcome Back
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                Sign in to continue to your account.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Username
                </label>

                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    autoComplete="username"
                    disabled={loading}
                    className="w-full rounded-lg border border-slate-300 dark:border-border bg-white dark:bg-muted/40 py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 dark:placeholder:text-muted-foreground outline-none transition focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 dark:disabled:bg-muted/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    disabled={loading}
                    className="w-full rounded-lg border border-slate-300 dark:border-border bg-white dark:bg-muted/40 py-3 pl-11 pr-20 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 dark:placeholder:text-muted-foreground outline-none transition focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 dark:disabled:bg-muted/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-foreground"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  "Signing in..."
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400">
                Secure access to Pubudu POS
              </p>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Pubudu POS. All rights reserved.
        </p>
      </div>
    </main>
  );
}