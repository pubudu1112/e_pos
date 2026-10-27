import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!(await hasPermission("SUPPLIER_VIEW"))) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to view suppliers.",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const supplierId = Number(id);

    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid supplier ID.",
        },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.findUnique({
      where: {
        id: supplierId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        openingBalance: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        {
          success: false,
          message: "Supplier not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...supplier,
        openingBalance: Number(supplier.openingBalance),
      },
    });
  } catch (error) {
    console.error("GET SUPPLIER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load supplier.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!(await hasPermission("SUPPLIER_UPDATE"))) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to update suppliers.",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const supplierId = Number(id);

    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid supplier ID.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const code = String(body.code ?? "").trim();
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim();
    const address = String(body.address ?? "").trim();
    const openingBalance = Number(body.openingBalance ?? 0);

    if (!code || !name) {
      return NextResponse.json(
        {
          success: false,
          message: "Supplier code and name are required.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Opening balance must be valid.",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.supplier.findFirst({
      where: {
        code,
        NOT: {
          id: supplierId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Supplier code already exists.",
        },
        { status: 409 }
      );
    }

    const supplier = await prisma.supplier.update({
      where: {
        id: supplierId,
      },
      data: {
        code,
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        openingBalance,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Supplier updated successfully.",
      data: {
        ...supplier,
        openingBalance: Number(supplier.openingBalance),
      },
    });
  } catch (error) {
    console.error("UPDATE SUPPLIER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update supplier.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!(await hasPermission("SUPPLIER_DELETE"))) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to delete suppliers.",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const supplierId = Number(id);

    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid supplier ID.",
        },
        { status: 400 }
      );
    }

    // Soft delete because supplier may already have purchases.
    await prisma.supplier.update({
      where: {
        id: supplierId,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Supplier deactivated successfully.",
    });
  } catch (error) {
    console.error("DELETE SUPPLIER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to deactivate supplier.",
      },
      { status: 500 }
    );
  }
}