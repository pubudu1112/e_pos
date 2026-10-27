import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { destroySession, getSession } from "@/lib/auth/session";

export async function POST() {
  try {
    const session = await getSession();

    if (session) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "LOGOUT",
          entity: "User",
          entityId: session.user.id.toString(),
          details: JSON.stringify({
            username: session.user.username,
            role: session.user.role.name,
          }),
        },
      });
    }

    await destroySession();

    return NextResponse.json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to logout.",
      },
      { status: 500 }
    );
  }
}