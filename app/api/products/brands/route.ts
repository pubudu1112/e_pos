import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// ============================================================
// GET - Get all brands
// Permission: BRAND_VIEW
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
        {
          status: 401,
        }
      );
    }

    // --------------------------------------------------------
    // Permission
    // --------------------------------------------------------

    const allowed = await hasPermission(
      "BRAND_VIEW"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to view brands.",
        },
        {
          status: 403,
        }
      );
    }

    // --------------------------------------------------------
    // Get Brands
    // --------------------------------------------------------

    const brands =
      await prisma.brand.findMany({
        orderBy: {
          name: "asc",
        },
      });

    return NextResponse.json({
      success: true,
      data: brands,
    });
  } catch (error) {
    console.error(
      "GET BRANDS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load brands.",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// POST - Create new brand
// Permission: BRAND_CREATE
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
        {
          status: 401,
        }
      );
    }

    // --------------------------------------------------------
    // Permission
    // --------------------------------------------------------

    const allowed = await hasPermission(
      "BRAND_CREATE"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to create brands.",
        },
        {
          status: 403,
        }
      );
    }

    // --------------------------------------------------------
    // Request Body
    // --------------------------------------------------------

    const body =
      await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
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
          message:
            "Brand name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Brand name cannot exceed 100 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (description.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Description cannot exceed 255 characters.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // Check Duplicate
    // --------------------------------------------------------

    const existingBrand =
      await prisma.brand.findUnique({
        where: {
          name,
        },
      });

    if (existingBrand) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A brand with this name already exists.",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------------
    // Create Brand
    // --------------------------------------------------------

    const brand =
      await prisma.brand.create({
        data: {
          name,
          description:
            description || null,
          isActive: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Brand created successfully.",
        data: brand,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE BRAND ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create brand.",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// PUT - Update brand
// Permission: BRAND_UPDATE
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
        {
          status: 401,
        }
      );
    }

    // --------------------------------------------------------
    // Permission
    // --------------------------------------------------------

    const allowed = await hasPermission(
      "BRAND_UPDATE"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to update brands.",
        },
        {
          status: 403,
        }
      );
    }

    // --------------------------------------------------------
    // Request Body
    // --------------------------------------------------------

    const body =
      await request.json();

    const id = Number(body.id);

    const name =
      typeof body.name === "string"
        ? body.name.trim()
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
            "Valid brand ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // Validate Name
    // --------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Brand name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Brand name cannot exceed 100 characters.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // Validate Description
    // --------------------------------------------------------

    if (description.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Description cannot exceed 255 characters.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // Check Brand Exists
    // --------------------------------------------------------

    const existingBrand =
      await prisma.brand.findUnique({
        where: {
          id,
        },
      });

    if (!existingBrand) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Brand not found.",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------------
    // Check Duplicate Name
    // --------------------------------------------------------

    const duplicateBrand =
      await prisma.brand.findFirst({
        where: {
          name,
          NOT: {
            id,
          },
        },
      });

    if (duplicateBrand) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another brand with this name already exists.",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------------
    // Update Brand
    // --------------------------------------------------------

    const brand =
      await prisma.brand.update({
        where: {
          id,
        },
        data: {
          name,
          description:
            description || null,
          isActive,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Brand updated successfully.",
      data: brand,
    });
  } catch (error) {
    console.error(
      "UPDATE BRAND ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update brand.",
      },
      {
        status: 500,
      }
    );
  }
}