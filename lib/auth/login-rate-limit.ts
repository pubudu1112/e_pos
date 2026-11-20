import { createHash } from "crypto";

import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RETENTION_MS = 24 * 60 * 60 * 1000;
let lastCleanupAt = 0;

function getWindowKey(username: string, request: Request, now: number) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = request.headers.get("x-real-ip")?.trim() || forwarded || "unknown";
  const bucket = Math.floor(now / WINDOW_MS);
  return createHash("sha256")
    .update(`${username.trim().toLowerCase()}|${address}|${bucket}`)
    .digest("hex");
}

export async function consumeLoginAttempt(username: string, request: Request) {
  const nowMs = Date.now();
  const key = getWindowKey(username, request, nowMs);
  const now = new Date(nowMs);
  const attempt = await prisma.loginAttempt.upsert({
    where: { key },
    create: { key, attempts: 1, createdAt: now, updatedAt: now },
    update: { attempts: { increment: 1 }, updatedAt: now },
    select: { attempts: true },
  });

  if (nowMs - lastCleanupAt > 60 * 60 * 1000) {
    lastCleanupAt = nowMs;
    void prisma.loginAttempt
      .deleteMany({ where: { createdAt: { lt: new Date(nowMs - RETENTION_MS) } } })
      .catch((error) => console.error("LOGIN RATE LIMIT CLEANUP ERROR:", error));
  }

  return {
    allowed: attempt.attempts <= MAX_ATTEMPTS,
    retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (nowMs % WINDOW_MS)) / 1000)),
  };
}

export async function clearLoginAttempts(username: string, request: Request) {
  const key = getWindowKey(username, request, Date.now());
  await prisma.loginAttempt.deleteMany({ where: { key } });
}
