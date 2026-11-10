
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!(await hasPermission("SMART_FORECAST_VIEW"))) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const alertId = Number(id);

    if (!Number.isInteger(alertId) || alertId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid alert ID." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const data: {
      isRead?: boolean;
      isActive?: boolean;
    } = {};

    if (typeof body.isRead === "boolean") {
      data.isRead = body.isRead;
    }

    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid update fields provided." },
        { status: 400 }
      );
    }

    const alert = await prisma.forecastAlert.update({
      where: { id: alertId },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Forecast alert updated successfully.",
      data: alert,
    });
  } catch (error) {
    console.error("Forecast alert PATCH error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update forecast alert." },
      { status: 500 }
    );
  }
}
