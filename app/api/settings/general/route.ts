
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import { getSession } from "@/lib/auth/session";
import { getStoredSettings } from "@/lib/settings";

const SETTINGS_FILE = path.join(
  process.cwd(),
  "data",
  "general-settings.json"
);

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

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
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

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

    const updated = {
      ...current,
      ...body,
    };

    const dir = path.dirname(SETTINGS_FILE);

    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(
      SETTINGS_FILE,
      JSON.stringify(updated, null, 2),
      "utf-8"
    );

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      data: updated,
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
