import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// ============================================================
// GET - Get all units
// Permission: UNIT_VIEW
// ============================================================

export async function GET() {
  try {
    // --------------------------------------------------------
    // Authentication
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // Permission
    // --------------------------------------------------------

    const allowed = await hasPermission(
      "UNIT_VIEW"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to view units.",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------------
    // Get Units
    // --------------------------------------------------------

    const units = await prisma.unit.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: units,
    });
  } catch (error) {
    console.error(
      "GET UNITS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load units.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST - Create new unit
// Permission: UNIT_CREATE
// ============================================================

export async function POST(
  request: Request
) {
  try {
    // --------------------------------------------------------
    // Authentication
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // Permission
    // --------------------------------------------------------

    const allowed = await hasPermission(
      "UNIT_CREATE"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to create units.",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------------
    // Request Body
    // --------------------------------------------------------

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const shortName =
      typeof body.shortName === "string"
        ? body.shortName.trim()
        : "";

    const description =
      typeof body.description ===
      "string"
        ? body.description.trim()
        : "";

    // --------------------------------------------------------
    // Validation
    // --------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit name is required.",
        },
        { status: 400 }
      );
    }

    if (!shortName) {
      return NextResponse.json(
        {
          success: false,
          message: "Short name is required.",
        },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unit name cannot exceed 50 characters.",
        },
        { status: 400 }
      );
    }

    if (shortName.length > 20) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Short name cannot exceed 20 characters.",
        },
        { status: 400 }
      );
    }

    if (description.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Description cannot exceed 255 characters.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // Check duplicate unit name
    // --------------------------------------------------------

    const existingName =
      await prisma.unit.findUnique({
        where: {
          name,
        },
      });

    if (existingName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A unit with this name already exists.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------------
    // Check duplicate short name
    // --------------------------------------------------------

    const existingShortName =
      await prisma.unit.findUnique({
        where: {
          shortName,
        },
      });

    if (existingShortName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A unit with this short name already exists.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------------
    // Create unit
    // --------------------------------------------------------

    const unit = await prisma.unit.create({
      data: {
        name,
        shortName,
        description:
          description || null,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Unit created successfully.",
        data: unit,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE UNIT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create unit.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - Update unit
// Permission: UNIT_UPDATE
// ============================================================

export async function PUT(
  request: Request
) {
  try {
    // --------------------------------------------------------
    // Authentication
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // Permission
    // --------------------------------------------------------

    const allowed = await hasPermission(
      "UNIT_UPDATE"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to update units.",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------------
    // Request Body
    // --------------------------------------------------------

    const body = await request.json();

    const id = Number(body.id);

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const shortName =
      typeof body.shortName === "string"
        ? body.shortName.trim()
        : "";

    const description =
      typeof body.description ===
      "string"
        ? body.description.trim()
        : "";

    const isActive =
      typeof body.isActive ===
      "boolean"
        ? body.isActive
        : true;

    // --------------------------------------------------------
    // Validate ID
    // --------------------------------------------------------

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid unit ID is required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // Validate name
    // --------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unit name is required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // Validate short name
    // --------------------------------------------------------

    if (!shortName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Short name is required.",
        },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unit name cannot exceed 50 characters.",
        },
        { status: 400 }
      );
    }

    if (shortName.length > 20) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Short name cannot exceed 20 characters.",
        },
        { status: 400 }
      );
    }

    if (description.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Description cannot exceed 255 characters.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // Check unit exists
    // --------------------------------------------------------

    const existingUnit =
      await prisma.unit.findUnique({
        where: {
          id,
        },
      });

    if (!existingUnit) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit not found.",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------------
    // Check duplicate name
    // --------------------------------------------------------

    const duplicateName =
      await prisma.unit.findFirst({
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
            "Another unit with this name already exists.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------------
    // Check duplicate short name
    // --------------------------------------------------------

    const duplicateShortName =
      await prisma.unit.findFirst({
        where: {
          shortName,
          NOT: {
            id,
          },
        },
      });

    if (duplicateShortName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another unit with this short name already exists.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------------
    // Update unit
    // --------------------------------------------------------

    const unit =
      await prisma.unit.update({
        where: {
          id,
        },
        data: {
          name,
          shortName,
          description:
            description || null,
          isActive,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Unit updated successfully.",
      data: unit,
    });
  } catch (error) {
    console.error(
      "UPDATE UNIT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update unit.",
      },
      { status: 500 }
    );
  }
}