import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// ============================================================
// GET - Get all taxes
// Permission: TAX_VIEW
// ============================================================

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

    const allowed = await hasPermission(
      "TAX_VIEW"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to view taxes.",
        },
        { status: 403 }
      );
    }

    const taxes = await prisma.tax.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: taxes,
    });
  } catch (error) {
    console.error(
      "GET TAXES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load taxes.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST - Create new tax
// Permission: TAX_CREATE
// ============================================================

export async function POST(
  request: Request
) {
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

    const allowed = await hasPermission(
      "TAX_CREATE"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to create taxes.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const rate = Number(body.rate);

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Tax name is required.",
        },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tax name cannot exceed 100 characters.",
        },
        { status: 400 }
      );
    }

    if (Number.isNaN(rate)) {
      return NextResponse.json(
        {
          success: false,
          message: "Tax rate is required.",
        },
        { status: 400 }
      );
    }

    if (rate < 0 || rate > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tax rate must be between 0 and 100.",
        },
        { status: 400 }
      );
    }

    // Check duplicate name
    const existingTax =
      await prisma.tax.findUnique({
        where: {
          name,
        },
      });

    if (existingTax) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A tax with this name already exists.",
        },
        { status: 409 }
      );
    }

    // Create tax
    const tax = await prisma.tax.create({
      data: {
        name,
        rate,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Tax created successfully.",
        data: tax,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE TAX ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create tax.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - Update tax
// Permission: TAX_UPDATE
// ============================================================

export async function PUT(
  request: Request
) {
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

    const allowed = await hasPermission(
      "TAX_UPDATE"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to update taxes.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const id = Number(body.id);

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const rate = Number(body.rate);

    const isActive =
      typeof body.isActive === "boolean"
        ? body.isActive
        : true;

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid tax ID is required.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Tax name is required.",
        },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tax name cannot exceed 100 characters.",
        },
        { status: 400 }
      );
    }

    if (Number.isNaN(rate)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tax rate is required.",
        },
        { status: 400 }
      );
    }

    if (rate < 0 || rate > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tax rate must be between 0 and 100.",
        },
        { status: 400 }
      );
    }

    // Check existing tax
    const existingTax =
      await prisma.tax.findUnique({
        where: {
          id,
        },
      });

    if (!existingTax) {
      return NextResponse.json(
        {
          success: false,
          message: "Tax not found.",
        },
        { status: 404 }
      );
    }

    // Check duplicate name
    const duplicateName =
      await prisma.tax.findFirst({
        where: {
          name,
          NOT: {
            id,
          },
        },
      });

    if (duplicateName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another tax with this name already exists.",
        },
        { status: 409 }
      );
    }

    // Update tax
    const tax = await prisma.tax.update({
      where: {
        id,
      },
      data: {
        name,
        rate,
        isActive,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Tax updated successfully.",
      data: tax,
    });
  } catch (error) {
    console.error(
      "UPDATE TAX ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update tax.",
      },
      { status: 500 }
    );
  }
}