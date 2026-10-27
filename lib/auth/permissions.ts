import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function hasPermission(
  permissionCode: string
): Promise<boolean> {
  const session = await getSession();

  if (!session) {
    return false;
  }

  // SUPER_ADMIN always has full access
  if (session.user.role.name === "SUPER_ADMIN") {
    return true;
  }

  const permission = await prisma.rolepermission.findFirst({
    where: {
      roleId: session.user.role.id,
      permission: {
        code: permissionCode,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(permission);
}