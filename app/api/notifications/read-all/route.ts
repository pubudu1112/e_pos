import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function PATCH() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const updated = await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read.",
      updatedCount: updated.count,
    });
  } catch (error) {
    console.error(
      "MARK ALL NOTIFICATIONS AS READ ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to mark all notifications as read.",
      },
      { status: 500 }
    );
  }
}