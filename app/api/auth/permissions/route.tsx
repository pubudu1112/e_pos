import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const ALL_SYSTEM_PERMISSIONS = [
  "DASHBOARD_VIEW",
  "POS_VIEW",
  "JOB_VIEW",
  "JOB_CREATE",
  "JOB_UPDATE",
  "PRODUCT_VIEW",
  "PRODUCT_CREATE",
  "PRODUCT_UPDATE",
  "PRODUCT_DELETE",
  "CATEGORY_VIEW",
  "CATEGORY_CREATE",
  "CATEGORY_UPDATE",
  "CATEGORY_DELETE",
  "BRAND_VIEW",
  "BRAND_CREATE",
  "BRAND_UPDATE",
  "BRAND_DELETE",
  "UNIT_VIEW",
  "UNIT_CREATE",
  "UNIT_UPDATE",
  "UNIT_DELETE",
  "TAX_VIEW",
  "TAX_CREATE",
  "TAX_UPDATE",
  "TAX_DELETE",
  "SERVICE_VIEW",
  "SERVICE_CREATE",
  "SERVICE_UPDATE",
  "SERVICE_DELETE",
  "SERVICE_CATEGORY_VIEW",
  "SERVICE_CATEGORY_CREATE",
  "SERVICE_CATEGORY_UPDATE",
  "SERVICE_CATEGORY_DELETE",
  "INVENTORY_VIEW",
  "INVENTORY_VIEW_MOVEMENTS",
  "PURCHASE_VIEW",
  "PURCHASE_CREATE",
  "PURCHASE_UPDATE",
  "SALE_VIEW",
  "SALE_CREATE",
  "CUSTOMER_VIEW",
  "CUSTOMER_CREATE",
  "CUSTOMER_UPDATE",
  "CUSTOMER_DELETE",
  "SUPPLIER_VIEW",
  "SUPPLIER_CREATE",
  "SUPPLIER_UPDATE",
  "SUPPLIER_DELETE",
  "EXPENSE_VIEW",
  "EXPENSE_CREATE",
  "EXPENSE_UPDATE",
  "EXPENSE_DELETE",
  "REPORT_SALES_VIEW",
  "REPORT_FINANCIAL_VIEW",
  "REPORT_ACTIVITY_VIEW",
  "SETTINGS_VIEW",
  "USER_VIEW",
  "USER_CREATE",
  "USER_UPDATE",
  "USER_DELETE",
  "ROLE_VIEW",
  "ROLE_CREATE",
  "ROLE_UPDATE",
  "ROLE_DELETE",
];

async function ensurePermissionsSeeded() {
  try {
    const count = await prisma.permission.count();
    if (count === 0) {
      await prisma.permission.createMany({
        data: ALL_SYSTEM_PERMISSIONS.map((code) => ({
          code,
          name: code
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" "),
          description: `Access to ${code.toLowerCase().replace(/_/g, " ")}`,
        })),
        skipDuplicates: true,
      });
    }
  } catch (error) {
    console.error("Auto-seed permissions error:", error);
  }
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    // SUPER_ADMIN has all permissions
    if (session.user.role.name === "SUPER_ADMIN") {
      ensurePermissionsSeeded().catch(() => {});

      const permissions = await prisma.permission.findMany({
        select: {
          code: true,
        },
        orderBy: {
          code: "asc",
        },
      });

      const dbCodes = permissions.map((p) => p.code);
      const allCodes = Array.from(new Set([...ALL_SYSTEM_PERMISSIONS, ...dbCodes]));

      return NextResponse.json({
        success: true,
        isSuperAdmin: true,
        data: allCodes,
      });
    }

    const rolePermissions = await prisma.rolepermission.findMany({
      where: {
        roleId: session.user.role.id,
      },
      include: {
        permission: {
          select: {
            code: true,
          },
        },
      },
    });

    const permissions = rolePermissions.map(
      (item) => item.permission.code
    );

    return NextResponse.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error("GET CURRENT USER PERMISSIONS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load permissions.",
      },
      { status: 500 }
    );
  }
}