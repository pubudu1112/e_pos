import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function authorize(permissionCodes: readonly string[] = []) {
  const session = await getSession();

  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (
    session.user.role.name === "SUPER_ADMIN" ||
    permissionCodes.length === 0
  ) {
    return { ok: true as const, session };
  }

  const grant = await prisma.rolepermission.findFirst({
    where: {
      roleId: session.user.role.id,
      permission: { code: { in: [...permissionCodes] } },
    },
    select: { id: true },
  });

  if (!grant) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, message: "Permission denied" },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, session };
}
