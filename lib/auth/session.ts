import { cookies } from "next/headers";
import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "pubudu_pos_session";

// 8 hours
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

type SessionUser = {
  id: number;
  username: string;
  fullName: string;
  status: string;
  role: {
    id: number;
    name: string;
    isActive: boolean;
  };
};

export async function createSession(userId: number) {
  const token = randomBytes(64).toString("hex");

  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_MS
  );

  await prisma.userSession.create({
    data: {
      userId,
      sessionToken: token,
      expiresAt,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function getSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    SESSION_COOKIE_NAME
  )?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.userSession.findUnique({
    where: {
      sessionToken: token,
    },
    include: {
      user: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  // Check session expiration
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.userSession.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  // Check user account status
  if (session.user.status !== "ACTIVE") {
    await prisma.userSession.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  // Check role status
  if (!session.user.role.isActive) {
    await prisma.userSession.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  const user: SessionUser = {
    id: session.user.id,
    username: session.user.username,
    fullName: session.user.fullName,
    status: session.user.status,
    role: {
      id: session.user.role.id,
      name: session.user.role.name,
      isActive: session.user.role.isActive,
    },
  };

  return {
    id: session.id,
    expiresAt: session.expiresAt,
    user,
  };
}

export async function destroySession() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    SESSION_COOKIE_NAME
  )?.value;

  if (token) {
    try {
      await prisma.userSession.delete({
        where: {
          sessionToken: token,
        },
      });
    } catch {
      // Session may already be deleted.
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}