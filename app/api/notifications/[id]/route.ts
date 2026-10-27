import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
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

    const { id } = await context.params;

    const notificationId = Number(id);

    if (!Number.isInteger(notificationId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid notification ID.",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Notification not found or already read.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error) {
    console.error(
      "MARK NOTIFICATION AS READ ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to mark notification as read.",
      },
      { status: 500 }
    );
  }
}