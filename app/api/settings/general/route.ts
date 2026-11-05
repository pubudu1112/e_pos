import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth/session";

const SETTINGS_FILE = path.join(process.cwd(), "data", "general-settings.json");

const DEFAULT_SETTINGS = {
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

async function getStoredSettings() {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf-8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const settings = await getStoredSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("GET SETTINGS ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const current = await getStoredSettings();
    const updated = { ...current, ...body };

    const dir = path.dirname(SETTINGS_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("UPDATE SETTINGS ERROR:", error);
    return NextResponse.json({ success: false, message: "Failed to save settings" }, { status: 500 });
  }
}

