
import fs from "fs/promises";
import path from "path";

// ============================================================
// SETTINGS FILE PATH
// ============================================================

const SETTINGS_FILE = path.join(
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
};

// ============================================================
// GET STORED SETTINGS
// ============================================================

export async function getStoredSettings() {
  try {
    const raw = await fs.readFile(
      SETTINGS_FILE,
      "utf-8"
    );

    const savedSettings = JSON.parse(raw);

    return {
      ...DEFAULT_SETTINGS,
      ...savedSettings,
    };
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
}
