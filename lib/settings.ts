
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

// ============================================================
// SETTINGS FILE PATH
// ============================================================

const LEGACY_SETTINGS_FILE = path.join(
  process.cwd(),
  "data",
  "general-settings.json"
);

// ============================================================
// DEFAULT SETTINGS
// ============================================================

export const DEFAULT_SETTINGS = {
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
  posAllowPriceEdit: "ADMIN_MANAGER",
};

// ============================================================
// GET STORED SETTINGS
// ============================================================

export async function getStoredSettings() {
  const persisted = await prisma.appSetting.findUnique({
    where: { key: "general" },
    select: { value: true },
  });

  if (persisted) {
    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(persisted.value),
    };
  }

  // One-time migration from the former local file store.
  let legacy: Record<string, unknown> = {};
  try {
    const raw = await fs.readFile(LEGACY_SETTINGS_FILE, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      legacy = parsed as Record<string, unknown>;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const initial = { ...DEFAULT_SETTINGS, ...legacy };
  await prisma.appSetting.createMany({
    data: [{ key: "general", value: JSON.stringify(initial), updatedAt: new Date() }],
    skipDuplicates: true,
  });

  const saved = await prisma.appSetting.findUnique({
    where: { key: "general" },
    select: { value: true },
  });

  return {
    ...DEFAULT_SETTINGS,
    ...JSON.parse(saved?.value ?? JSON.stringify(initial)),
  };
}

export async function saveStoredSettings(settings: Record<string, unknown>) {
  const value = JSON.stringify(settings);
  await prisma.appSetting.upsert({
    where: { key: "general" },
    create: { key: "general", value, updatedAt: new Date() },
    update: { value },
  });
  return settings;
}
