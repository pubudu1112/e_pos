import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// ============================================================
// GET - Get all service categories
// Permission: SERVICE_CATEGORY_VIEW
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
      "SERVICE_CATEGORY_VIEW"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to view service categories.",
        },
        { status: 403 }
      );
    }

    // Ensure standard service categories exist
    const standardCategories = [
      { name: "Photocopy", description: "B&W Photocopying and duplication services" },
      { name: "Color printing", description: "Color laser printing, photo and sticker printing" },
      { name: "Binding", description: "Spiral, comb, tape, and hardcover book binding" },
      { name: "Laminating", description: "Thermal film lamination for documents, posters, and cards" },
      { name: "Scanning", description: "Document and photo digital scanning services" },
    ];

    for (const cat of standardCategories) {
      const existing = await prisma.servicecategory.findFirst({
        where: { name: cat.name },
      });
      if (!existing) {
        await prisma.servicecategory.create({
          data: {
            name: cat.name,
            description: cat.description,
            isActive: true,
            updatedAt: new Date(),
          },
        });
      }
    }

    const categories =
      await prisma.servicecategory.findMany({
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
      "GET SERVICE CATEGORIES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load service categories.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST - Create service category
// Permission: SERVICE_CATEGORY_CREATE
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
      "SERVICE_CATEGORY_CREATE"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to create service categories.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    // ----------------------------------------------------------
    // Validation
    // ----------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Service category name is required.",
        },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Service category name cannot exceed 100 characters.",
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

    // ----------------------------------------------------------
    // Check duplicate name
    // ----------------------------------------------------------

    const existingCategory =
      await prisma.servicecategory.findUnique({
        where: {
          name,
        },
      });

    if (existingCategory) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A service category with this name already exists.",
        },
        { status: 409 }
      );
    }

    // ----------------------------------------------------------
    // Create category
    // ----------------------------------------------------------

    const category =
  await prisma.servicecategory.create({
    data: {
      name,
      description: description || null,
      isActive: true,
      updatedAt: new Date(),
    },
  });

    return NextResponse.json(
      {
        success: true,
        message:
          "Service category created successfully.",
        data: category,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE SERVICE CATEGORY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create service category.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - Update service category
// Permission: SERVICE_CATEGORY_UPDATE
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
      "SERVICE_CATEGORY_UPDATE"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to update service categories.",
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

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const isActive =
      typeof body.isActive === "boolean"
        ? body.isActive
        : true;

    // ----------------------------------------------------------
    // Validation
    // ----------------------------------------------------------

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid service category ID is required.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Service category name is required.",
        },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Service category name cannot exceed 100 characters.",
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

    // ----------------------------------------------------------
    // Check existing category
    // ----------------------------------------------------------

    const existingCategory =
      await prisma.servicecategory.findUnique({
        where: {
          id,
        },
      });

    if (!existingCategory) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Service category not found.",
        },
        { status: 404 }
      );
    }

    // ----------------------------------------------------------
    // Check duplicate name
    // ----------------------------------------------------------

    const duplicateName =
      await prisma.servicecategory.findFirst({
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
            "Another service category with this name already exists.",
        },
        { status: 409 }
      );
    }

    // ----------------------------------------------------------
    // Update category
    // ----------------------------------------------------------

    const category =
      await prisma.servicecategory.update({
        where: {
          id,
        },
        data: {
          name,
          description: description || null,
          isActive,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Service category updated successfully.",
      data: category,
    });
  } catch (error) {
    console.error(
      "UPDATE SERVICE CATEGORY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update service category.",
      },
      { status: 500 }
    );
  }
}