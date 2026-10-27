import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
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

    const suppliers = await prisma.supplier.findMany({
      orderBy: {
        name: "asc",
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

    return NextResponse.json({
      success: true,
      data: suppliers.map((supplier) => ({
        ...supplier,
        openingBalance: Number(supplier.openingBalance),
      })),
    });
  } catch (error) {
    console.error("GET SUPPLIERS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load suppliers.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (!(await hasPermission("SUPPLIER_CREATE"))) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to create suppliers.",
        },
        { status: 403 }
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
          message: "Opening balance must be a valid non-negative amount.",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.supplier.findUnique({
      where: {
        code,
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

    const supplier = await prisma.supplier.create({
      data: {
        code,
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        openingBalance,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Supplier created successfully.",
      data: {
        ...supplier,
        openingBalance: Number(supplier.openingBalance),
      },
    });
  } catch (error) {
    console.error("CREATE SUPPLIER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create supplier.",
      },
      { status: 500 }
    );
  }
}