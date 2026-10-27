import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

async function requireSuperAdmin() {
  const session = await getSession();

  if (!session) {
    return {
      session: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      ),
    };
  }

  if (session.user.role.name !== "SUPER_ADMIN") {
    return {
      session: null,
      response: NextResponse.json(
        {
          success: false,
          message: "Only SUPER_ADMIN can manage role permissions.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    session,
    response: null,
  };
}

// GET permissions
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();

    if (auth.response) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const roleName = searchParams.get("role");

    const roles = await prisma.role.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    const permissions = await prisma.permission.findMany({
      orderBy: {
        code: "asc",
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    });

    let selectedPermissionIds: number[] = [];

    if (roleName) {
      const role = await prisma.role.findUnique({
        where: {
          name: roleName,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (role) {
        const rolePermissions =
          await prisma.rolepermission.findMany({
            where: {
              roleId: role.id,
            },
            select: {
              permissionId: true,
            },
          });

        selectedPermissionIds = rolePermissions.map(
          (item) => item.permissionId
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        roles,
        permissions,
        selectedPermissionIds,
      },
    });
  } catch (error) {
    console.error("GET ROLE PERMISSIONS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load permissions.",
      },
      { status: 500 }
    );
  }
}

// SAVE permissions
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();

    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();

    const roleName =
      typeof body.roleName === "string"
        ? body.roleName.trim()
        : "";

    const requestedPermissionIds: number[] = Array.isArray(
  body.permissionIds
)
  ? body.permissionIds
      .map((value: unknown) => Number(value))
      .filter(
        (id: number) =>
          Number.isInteger(id) && id > 0
      )
  : [];

    if (!roleName) {
      return NextResponse.json(
        {
          success: false,
          message: "Role is required.",
        },
        { status: 400 }
      );
    }

    const role = await prisma.role.findUnique({
      where: {
        name: roleName,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          message: "Role not found.",
        },
        { status: 404 }
      );
    }

    const allPermissions = await prisma.permission.findMany({
      select: {
        id: true,
      },
    });

    // SUPER_ADMIN must always have all permissions.
    const permissionIds: number[] =
  role.name === "SUPER_ADMIN"
    ? allPermissions.map(
        (permission) => permission.id
      )
    : [...new Set(requestedPermissionIds)];

    const validPermissionIds = new Set(
      allPermissions.map((permission) => permission.id)
    );

    const filteredPermissionIds: number[] =
  role.name === "SUPER_ADMIN"
    ? permissionIds
    : permissionIds.filter((id: number) =>
        validPermissionIds.has(id)
      );

    await prisma.$transaction(async (tx) => {
      await tx.rolepermission.deleteMany({
        where: {
          roleId: role.id,
        },
      });

      if (filteredPermissionIds.length > 0) {
        await tx.rolepermission.createMany({
          data: filteredPermissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `${role.name} permissions saved successfully.`,
      data: {
        roleId: role.id,
        roleName: role.name,
        permissionCount: filteredPermissionIds.length,
      },
    });
  } catch (error) {
    console.error("SAVE ROLE PERMISSIONS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to save role permissions.",
      },
      { status: 500 }
    );
  }
}