
import { NextRequest, NextResponse } from "next/server";

import { authorize } from "@/lib/auth/authorize";
import { getStoredSettings, saveStoredSettings } from "@/lib/settings";

export async function GET() {
  try {
    const auth = await authorize(["SETTINGS_VIEW"]);
    if (!auth.ok) return auth.response;

    const settings = await getStoredSettings();

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("GET SETTINGS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load settings",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authorize(["SETTINGS_UPDATE"]);
    if (!auth.ok) return auth.response;

    const body = await req.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid settings data.",
        },
        { status: 400 }
      );
    }

    const current = await getStoredSettings();
    const stringFields = [
      "storeName", "tagline", "phone", "email", "address",
      "currencySymbol", "currencyCode", "invoicePrefix", "jobPrefix",
      "expensePrefix", "receiptFooterMessage", "vatNumber", "businessRegNumber",
    ] as const;
    const updated: Record<string, unknown> = { ...current };

    for (const field of stringFields) {
      if (body[field] === undefined) continue;
      if (typeof body[field] !== "string" || body[field].length > 500) {
        return NextResponse.json(
          { success: false, message: `Invalid value for ${field}.` },
          { status: 400 }
        );
      }
      updated[field] = body[field].trim();
    }

    if (body.defaultTaxRate !== undefined) {
      const defaultTaxRate = Number(body.defaultTaxRate);
      if (!Number.isFinite(defaultTaxRate) || defaultTaxRate < 0 || defaultTaxRate > 100) {
        return NextResponse.json(
          { success: false, message: "Tax rate must be between 0 and 100." },
          { status: 400 }
        );
      }
      updated.defaultTaxRate = defaultTaxRate;
    }

    if (body.posDisplayMode !== undefined) {
      if (body.posDisplayMode !== "STANDARD" && body.posDisplayMode !== "IMAGE") {
        return NextResponse.json(
          { success: false, message: "POS layout must be Standard or Image POS." },
          { status: 400 }
        );
      }
      updated.posDisplayMode = body.posDisplayMode;
    }

    const saved = await saveStoredSettings(updated);

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      data: saved,
    });
  } catch (error) {
    console.error("UPDATE SETTINGS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to save settings",
      },
      { status: 500 }
    );
  }
}
