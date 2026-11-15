"use client";

import { useEffect, useState } from "react";
import {
      FileText,
  Loader2,
  Phone,
  Printer,
    Save,
  Settings,
  Store,
} from "lucide-react";
import { toast } from "sonner";

type SettingsData = {
  storeName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  currencySymbol: string;
  currencyCode: string;
  invoicePrefix: string;
  jobPrefix: string;
  expensePrefix: string;
  defaultTaxRate: number;
  receiptFooterMessage: string;
  vatNumber: string;
  businessRegNumber: string;
};

export default function GeneralSettingsClient() {
  const [settings, setSettings] = useState<SettingsData>({
    storeName: "Pubudu Creative Hub",
    tagline: "Printing • Designing • Stationery • Mobile Accessories",
    phone: "077 123 4567 / 011 234 5678",
    email: "pubuducreative@gmail.com",
    address: "No. 128, High Level Road, Nugegoda, Sri Lanka",
    currencySymbol: "Rs.",
    currencyCode: "LKR",
    invoicePrefix: "INV-",
    jobPrefix: "JOB-",
    expensePrefix: "EXP-",
    defaultTaxRate: 0,
    receiptFooterMessage: "Thank you for your business! Please come again.",
    vatNumber: "VAT-12345678-000",
    businessRegNumber: "PV-987654",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/settings/general");
        const json = await res.json();
        if (json.success && json.data) {
          setSettings(json.data);
        }
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/settings/general", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.message || "Failed to save settings");
        return;
      }
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Network error while saving settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/50 dark:bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">General Settings</h1>
                <p className="text-sm text-slate-500 dark:text-muted-foreground">
                  Configure store profile, thermal receipt headers, and invoicing numbering
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            form="settings-form"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Settings</span>
          </button>
        </div>

        {/* Form and Preview Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Form Fields */}
          <form id="settings-form" onSubmit={handleSave} className="space-y-6 lg:col-span-2">
            {/* Store Information */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                Store Profile & Identity
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground">Business branding printed on thermal receipts</p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm text-slate-900 dark:text-foreground focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Tagline / Business Subtitle
                  </label>
                  <input
                    type="text"
                    value={settings.tagline}
                    onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm text-slate-900 dark:text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Business Reg No (BRN)
                  </label>
                  <input
                    type="text"
                    value={settings.businessRegNumber}
                    onChange={(e) => setSettings({ ...settings, businessRegNumber: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm text-slate-900 dark:text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    VAT / Tax Number
                  </label>
                  <input
                    type="text"
                    value={settings.vatNumber}
                    onChange={(e) => setSettings({ ...settings, vatNumber: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm text-slate-900 dark:text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Contact Information
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground">Contact details visible to customers</p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Contact Phone Number *
                  </label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm text-slate-900 dark:text-foreground focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm text-slate-900 dark:text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Shop Address
                  </label>
                  <textarea
                    rows={2}
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 p-3 text-sm text-slate-900 dark:text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Currency & Document Numbering */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-border bg-white dark:bg-card p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Currency & Document Sequences
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground">Formatting rules for monetary amounts and order sequences</p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={settings.currencySymbol}
                    onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm font-semibold text-slate-900 dark:text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.invoicePrefix}
                    onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm font-mono text-slate-900 dark:text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Job Order Prefix
                  </label>
                  <input
                    type="text"
                    value={settings.jobPrefix}
                    onChange={(e) => setSettings({ ...settings, jobPrefix: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm font-mono text-slate-900 dark:text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Receipt Footer Message
                  </label>
                  <input
                    type="text"
                    value={settings.receiptFooterMessage}
                    onChange={(e) => setSettings({ ...settings, receiptFooterMessage: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted/40 px-3.5 text-sm text-slate-900 dark:text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Thermal Receipt Live Preview */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground flex items-center gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              Live Receipt Preview
            </h3>

            <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-border bg-white dark:bg-card p-5 font-mono text-xs text-slate-800 dark:text-slate-200 shadow-sm">
              <div className="text-center">
                <p className="font-bold text-sm uppercase text-slate-900 dark:text-foreground">{settings.storeName || "STORE NAME"}</p>
                <p className="text-[10px] text-slate-500 dark:text-muted-foreground mt-0.5">{settings.tagline}</p>
                <p className="text-[10px] text-slate-500 dark:text-muted-foreground">{settings.address}</p>
                <p className="text-[10px] text-slate-500 dark:text-muted-foreground">Tel: {settings.phone}</p>
              </div>

              <div className="my-3 border-t border-dashed border-slate-300 dark:border-border" />

              <div className="flex justify-between text-[11px]">
                <span>Invoice: {settings.invoicePrefix}2026-0042</span>
                <span>{new Date().toLocaleDateString("en-LK")}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-muted-foreground">Customer: Walk-in Customer</div>

              <div className="my-2 border-t border-slate-200 dark:border-border" />

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>A4 Double-Side Photocopy (x5)</span>
                  <span>Rs. 100.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Color Printing Glossy (x2)</span>
                  <span>Rs. 240.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Spiral Binding 12mm (x1)</span>
                  <span>Rs. 250.00</span>
                </div>
              </div>

              <div className="my-2 border-t border-dashed border-slate-300" />

              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span>{settings.currencySymbol} 590.00</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Cash Received:</span>
                <span>{settings.currencySymbol} 1,000.00</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-emerald-700">
                <span>Change Returned:</span>
                <span>{settings.currencySymbol} 410.00</span>
              </div>

              <div className="my-3 border-t border-dashed border-slate-300" />

              <div className="text-center text-[10px] text-slate-500">
                <p>{settings.receiptFooterMessage}</p>
                <p className="mt-1">POS by Pubudu Creative Hub</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

