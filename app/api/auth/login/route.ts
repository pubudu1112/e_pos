import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPasswordLengthAllowed, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { clearLoginAttempts, consumeLoginAttempt } from "@/lib/auth/login-rate-limit";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Username and password are required." },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;
    const username = typeof payload.username === "string" ? payload.username.trim() : "";
    const password = typeof payload.password === "string" ? payload.password : "";

    if (!username || username.length > 50 || !password || !isPasswordLengthAllowed(password)) {
      return NextResponse.json(
        {
          success: false,
          message: "Username and password are required.",
        },
        { status: 400 }
      );
    }

    const rateLimit = await consumeLoginAttempt(username, request);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many sign-in attempts. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        username,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password.",
        },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password.",
        },
        { status: 401 }
      );
    }

    const passwordValid = await verifyPassword(
      password,
      user.passwordHash
    );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password.",
        },
        { status: 401 }
      );
    }

    await clearLoginAttempts(username, request);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    await createSession(user.id);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entity: "User",
        entityId: user.id.toString(),
        details: JSON.stringify({
          username: user.username,
          role: user.role.name,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
