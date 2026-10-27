import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// ============================================================
// GET
// Load all categories
// Permission: CATEGORY_VIEW
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

    const allowed = await hasPermission("CATEGORY_VIEW");

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to view categories.",
        },
        {
          status: 403,
        }
      );
    }

    // --------------------------------------------------------
    // Get Categories
    // --------------------------------------------------------

    const categories =
      await prisma.category.findMany({
        orderBy: {
          name: "asc",
        },
      });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error(
      "Get categories error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load categories.",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// POST
// Create category
// Permission: CATEGORY_CREATE
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
      "CATEGORY_CREATE"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to create categories.",
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
            "Category name is required.",
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
            "Category name cannot exceed 100 characters.",
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
    // Check duplicate
    // --------------------------------------------------------

    const existingCategory =
      await prisma.category.findUnique({
        where: {
          name,
        },
      });

    if (existingCategory) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Category already exists.",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------------
    // Create
    // --------------------------------------------------------

    const category =
      await prisma.category.create({
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
          "Category created successfully.",
        data: category,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Create category error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create category.",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// PUT
// Update category
// Permission: CATEGORY_UPDATE
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
      "CATEGORY_UPDATE"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to update categories.",
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

    // --------------------------------------------------------
    // ID
    // --------------------------------------------------------

    const id = Number(body.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid category ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // Name
    // --------------------------------------------------------

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Category name is required.",
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
            "Category name cannot exceed 100 characters.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // Description
    // --------------------------------------------------------

    const description =
      typeof body.description ===
      "string"
        ? body.description.trim()
        : "";

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
    // Status
    // --------------------------------------------------------

    const isActive =
      typeof body.isActive ===
      "boolean"
        ? body.isActive
        : true;

    // --------------------------------------------------------
    // Check category exists
    // --------------------------------------------------------

    const existingCategory =
      await prisma.category.findUnique({
        where: {
          id,
        },
      });

    if (!existingCategory) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Category not found.",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------------
    // Check duplicate name
    // --------------------------------------------------------

    const duplicateCategory =
      await prisma.category.findFirst({
        where: {
          name,
          NOT: {
            id,
          },
        },
      });

    if (duplicateCategory) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another category with this name already exists.",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------------
    // Update
    // --------------------------------------------------------

    const category =
      await prisma.category.update({
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
        "Category updated successfully.",
      data: category,
    });
  } catch (error) {
    console.error(
      "Update category error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update category.",
      },
      {
        status: 500,
      }
    );
  }
}