"use client";

import Link from "next/link";
import {
  BarChart3,
  DollarSign,
  FileText,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";

const reportCards = [
  {
    title: "Sales Reports",
    description:
      "Detailed sales analysis, cashier breakdown, top-selling products, and revenue trends.",
    href: "/reports/sales",
    icon: BarChart3,
    color: "bg-blue-500/10 text-blue-600",
    badge: "Daily & Cashier",
  },
  {
    title: "Financial Reports",
    description:
      "Complete Profit & Loss statement, cost of goods sold (COGS), operating expenses, and net profit margins.",
    href: "/reports/financial",
    icon: DollarSign,
    color: "bg-emerald-500/10 text-emerald-600",
    badge: "P&L Statement",
  },
  {
    title: "Activity & Audit Logs",
    description:
      "Audit trail of user logins, sales transactions, stock updates, and system operations.",
    href: "/reports/activity",
    icon: FileText,
    color: "bg-purple-500/10 text-purple-600",
    badge: "Compliance & Security",
  },
];

export default function ReportsOverviewClient() {
  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports Hub</h1>
              <p className="text-sm text-slate-500">
                Access sales analytics, financial profit & loss statements, and activity audits
              </p>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {reportCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-slate-100 dark:bg-muted px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-foreground group-hover:text-primary">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-muted-foreground">{card.description}</p>
                </div>

                <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-primary">
                  <span>Open Report</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Informational Banner */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-muted text-slate-700 dark:text-slate-200">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-foreground">Real-Time Financial Intelligence</h4>
              <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                All reports compute live directly against the MariaDB database with zero batch delay. Prices and currency values are formatted in Sri Lankan Rupees (Rs. / LKR). You can print formal financial statements directly from each report screen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
