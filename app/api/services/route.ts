import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// ============================================================
// GET - Get all services
// Permission: SERVICE_VIEW
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
      "SERVICE_VIEW"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to view services.",
        },
        { status: 403 }
      );
    }

    const services =
      await prisma.service.findMany({
        include: {
          servicecategory: {
            select: {
              id: true,
              name: true,
            },
          },
          tax: {
            select: {
              id: true,
              name: true,
              rate: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

    return NextResponse.json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error(
      "GET SERVICES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load services.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST - Create new service
// Permission: SERVICE_CREATE
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
      "SERVICE_CREATE"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to create services.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const code =
      typeof body.code === "string"
        ? body.code.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : null;

    const categoryId = Number(
      body.categoryId
    );

    const taxId =
      body.taxId === null ||
      body.taxId === undefined ||
      body.taxId === ""
        ? null
        : Number(body.taxId);

    const basePrice = Number(
      body.basePrice
    );

    // ----------------------------------------------------------
    // Validation
    // ----------------------------------------------------------

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: "Service code is required.",
        },
        { status: 400 }
      );
    }

    if (code.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Service code cannot exceed 50 characters.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Service name is required.",
        },
        { status: 400 }
      );
    }

    if (name.length > 200) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Service name cannot exceed 200 characters.",
        },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(categoryId) ||
      categoryId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid service category is required.",
        },
        { status: 400 }
      );
    }

    if (
      taxId !== null &&
      (Number.isNaN(taxId) || taxId <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid tax selected.",
        },
        { status: 400 }
      );
    }

    if (Number.isNaN(basePrice)) {
      return NextResponse.json(
        {
          success: false,
          message: "Base price is required.",
        },
        { status: 400 }
      );
    }

    if (basePrice < 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Base price cannot be negative.",
        },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------
    // Check duplicate code
    // ----------------------------------------------------------

    const existingService =
      await prisma.service.findUnique({
        where: {
          code,
        },
      });

    if (existingService) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A service with this code already exists.",
        },
        { status: 409 }
      );
    }

    // ----------------------------------------------------------
    // Check category
    // ----------------------------------------------------------

    const category =
      await prisma.servicecategory.findUnique({
        where: {
          id: categoryId,
        },
      });

    if (!category) {
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
    // Check tax
    // ----------------------------------------------------------

    if (taxId !== null) {
      const tax =
        await prisma.tax.findUnique({
          where: {
            id: taxId,
          },
        });

      if (!tax) {
        return NextResponse.json(
          {
            success: false,
            message: "Tax not found.",
          },
          { status: 404 }
        );
      }
    }

    // ----------------------------------------------------------
    // Create service
    // ----------------------------------------------------------

    const service =
  await prisma.service.create({
    data: {
      code,
      name,
      description: description || null,
      categoryId,
      taxId,
      basePrice,
      status: "ACTIVE",
      updatedAt: new Date(),
    },
        include: {
          servicecategory: {
            select: {
              id: true,
              name: true,
            },
          },
          tax: {
            select: {
              id: true,
              name: true,
              rate: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Service created successfully.",
        data: service,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE SERVICE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create service.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - Update service
// Permission: SERVICE_UPDATE
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
      "SERVICE_UPDATE"
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to update services.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const id = Number(body.id);

    const code =
      typeof body.code === "string"
        ? body.code.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : null;

    const categoryId = Number(
      body.categoryId
    );

    const taxId =
      body.taxId === null ||
      body.taxId === undefined ||
      body.taxId === ""
        ? null
        : Number(body.taxId);

    const basePrice = Number(
      body.basePrice
    );

    const status =
      body.status === "INACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    // ----------------------------------------------------------
    // Validation
    // ----------------------------------------------------------

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid service ID is required.",
        },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: "Service code is required.",
        },
        { status: 400 }
      );
    }

    if (code.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Service code cannot exceed 50 characters.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Service name is required.",
        },
        { status: 400 }
      );
    }

    if (name.length > 200) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Service name cannot exceed 200 characters.",
        },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(categoryId) ||
      categoryId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid service category is required.",
        },
        { status: 400 }
      );
    }

    if (
      taxId !== null &&
      (Number.isNaN(taxId) || taxId <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid tax selected.",
        },
        { status: 400 }
      );
    }

    if (Number.isNaN(basePrice)) {
      return NextResponse.json(
        {
          success: false,
          message: "Base price is required.",
        },
        { status: 400 }
      );
    }

    if (basePrice < 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Base price cannot be negative.",
        },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------
    // Check existing service
    // ----------------------------------------------------------

    const existingService =
      await prisma.service.findUnique({
        where: {
          id,
        },
      });

    if (!existingService) {
      return NextResponse.json(
        {
          success: false,
          message: "Service not found.",
        },
        { status: 404 }
      );
    }

    // ----------------------------------------------------------
    // Check duplicate code
    // ----------------------------------------------------------

    const duplicateCode =
      await prisma.service.findFirst({
        where: {
          code,
          NOT: {
            id,
          },
        },
      });

    if (duplicateCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another service with this code already exists.",
        },
        { status: 409 }
      );
    }

    // ----------------------------------------------------------
    // Check category
    // ----------------------------------------------------------

    const category =
      await prisma.servicecategory.findUnique({
        where: {
          id: categoryId,
        },
      });

    if (!category) {
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
    // Check tax
    // ----------------------------------------------------------

    if (taxId !== null) {
      const tax =
        await prisma.tax.findUnique({
          where: {
            id: taxId,
          },
        });

      if (!tax) {
        return NextResponse.json(
          {
            success: false,
            message: "Tax not found.",
          },
          { status: 404 }
        );
      }
    }

    // ----------------------------------------------------------
    // Update service
    // ----------------------------------------------------------

    const service =
      await prisma.service.update({
        where: {
          id,
        },
        data: {
          code,
          name,
          description: description || null,
          categoryId,
          taxId,
          basePrice,
          status,
          updatedAt: new Date(),
        },
        include: {
          servicecategory: {
            select: {
              id: true,
              name: true,
            },
          },
          tax: {
            select: {
              id: true,
              name: true,
              rate: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Service updated successfully.",
      data: service,
    });
  } catch (error) {
    console.error(
      "UPDATE SERVICE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update service.",
      },
      { status: 500 }
    );
  }
}