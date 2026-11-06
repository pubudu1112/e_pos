import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// ============================================================
// DEFAULT SERVICES SEED (Photo & Printing Services with Cost Breakdown)
// ============================================================

const DEFAULT_PRINTING_SERVICES = [
  {
    code: "SRV-PC-A4-SS",
    name: "A4 One Side Photocopy",
    description: "Standard A4 single-sided black & white photocopy",
    categoryName: "Photocopy",
    basePrice: 10.0,
    paperCost: 2.5,
    tonerCost: 1.0,
    machineCost: 0.5,
  },
  {
    code: "SRV-PC-A4-DS",
    name: "A4 Double Side Photocopy",
    description: "Standard A4 double-sided black & white photocopy",
    categoryName: "Photocopy",
    basePrice: 15.0,
    paperCost: 2.5,
    tonerCost: 2.0,
    machineCost: 1.0,
  },
  {
    code: "SRV-PC-A3-SS",
    name: "A3 One Side Photocopy",
    description: "Large format A3 single-sided black & white photocopy",
    categoryName: "Photocopy",
    basePrice: 25.0,
    paperCost: 6.0,
    tonerCost: 2.5,
    machineCost: 1.5,
  },
  {
    code: "SRV-PC-A3-DS",
    name: "A3 Double Side Photocopy",
    description: "Large format A3 double-sided black & white photocopy",
    categoryName: "Photocopy",
    basePrice: 40.0,
    paperCost: 6.0,
    tonerCost: 5.0,
    machineCost: 2.5,
  },
  {
    code: "SRV-CP-A4",
    name: "Colour Printing (A4)",
    description: "High-resolution full color laser printing on A4 paper",
    categoryName: "Color printing",
    basePrice: 50.0,
    paperCost: 4.0,
    tonerCost: 12.0,
    machineCost: 3.0,
  },
  {
    code: "SRV-STK-A4",
    name: "Sticker Printing (A4 Glossy)",
    description: "Glossy adhesive sticker paper color printing",
    categoryName: "Color printing",
    basePrice: 120.0,
    paperCost: 30.0,
    tonerCost: 18.0,
    machineCost: 5.0,
  },
  {
    code: "SRV-PH-4X6",
    name: "Photo Printing (4x6 Glossy)",
    description: "Standard 4R (4x6 inch) glossy photo paper print",
    categoryName: "Color printing",
    basePrice: 80.0,
    paperCost: 15.0,
    tonerCost: 16.0,
    machineCost: 4.0,
  },
];

async function ensureDefaultServicesSeeded() {
  try {
    for (const item of DEFAULT_PRINTING_SERVICES) {
      let cat = await prisma.servicecategory.findFirst({
        where: { name: item.categoryName },
      });

      if (!cat) {
        cat = await prisma.servicecategory.create({
          data: {
            name: item.categoryName,
            description: `${item.categoryName} services`,
            isActive: true,
            updatedAt: new Date(),
          },
        });
      }

      const existingService = await prisma.service.findFirst({
        where: {
          OR: [
            { code: item.code },
            { name: item.name },
          ],
        },
      });

      if (!existingService) {
        await prisma.service.create({
          data: {
            code: item.code,
            name: item.name,
            description: item.description,
            categoryId: cat.id,
            basePrice: item.basePrice,
            paperCost: item.paperCost,
            tonerCost: item.tonerCost,
            machineCost: item.machineCost,
            status: "ACTIVE",
            updatedAt: new Date(),
          },
        });
      } else if (
        existingService.paperCost === null ||
        Number(existingService.paperCost) === 0
      ) {
        await prisma.service.update({
          where: { id: existingService.id },
          data: {
            paperCost: item.paperCost,
            tonerCost: item.tonerCost,
            machineCost: item.machineCost,
          },
        });
      }
    }
  } catch (err) {
    console.error("Auto-seed default services error:", err);
  }
}

// ============================================================
// GET - Get all services with Cost & Profit Calculations
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

    const allowed = await hasPermission("SERVICE_VIEW");

    if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to view services.",
        },
        { status: 403 }
      );
    }

    await ensureDefaultServicesSeeded();

    const services = await prisma.service.findMany({
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

    const enrichedServices = services.map((s) => {
      const basePrice = Number(s.basePrice || 0);
      const paperCost = Number(s.paperCost || 0);
      const tonerCost = Number(s.tonerCost || 0);
      const machineCost = Number(s.machineCost || 0);
      const totalCost = paperCost + tonerCost + machineCost;
      const netProfit = basePrice - totalCost;
      const marginPercent =
        basePrice > 0 ? (netProfit / basePrice) * 100 : 0;

      return {
        id: s.id,
        code: s.code,
        name: s.name,
        description: s.description,
        categoryId: s.categoryId,
        taxId: s.taxId,
        basePrice,
        paperCost,
        tonerCost,
        machineCost,
        totalCost,
        netProfit,
        marginPercent: Math.round(marginPercent * 10) / 10,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        servicecategory: s.servicecategory,
        tax: s.tax
          ? {
              id: s.tax.id,
              name: s.tax.name,
              rate: Number(s.tax.rate),
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedServices,
    });
  } catch (error) {
    console.error("GET SERVICES ERROR:", error);

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
// POST - Create new service with Paper/Toner/Machine Cost
// Permission: SERVICE_CREATE
// ============================================================

export async function POST(request: Request) {
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

    const allowed = await hasPermission("SERVICE_CREATE");

    if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to create services.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const code =
      typeof body.code === "string" ? body.code.trim() : "";
    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : null;
    const categoryId = Number(body.categoryId);
    const taxId =
      body.taxId === null ||
      body.taxId === undefined ||
      body.taxId === ""
        ? null
        : Number(body.taxId);

    const basePrice = Number(body.basePrice);
    const paperCost =
      body.paperCost !== undefined && body.paperCost !== null
        ? Math.max(0, Number(body.paperCost))
        : 0;
    const tonerCost =
      body.tonerCost !== undefined && body.tonerCost !== null
        ? Math.max(0, Number(body.tonerCost))
        : 0;
    const machineCost =
      body.machineCost !== undefined && body.machineCost !== null
        ? Math.max(0, Number(body.machineCost))
        : 0;

    // Validation
    if (!code) {
      return NextResponse.json(
        { success: false, message: "Service code is required." },
        { status: 400 }
      );
    }

    if (code.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message: "Service code cannot exceed 50 characters.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Service name is required." },
        { status: 400 }
      );
    }

    if (Number.isNaN(categoryId) || categoryId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid service category is required.",
        },
        { status: 400 }
      );
    }

    if (Number.isNaN(basePrice) || basePrice < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid selling base price is required.",
        },
        { status: 400 }
      );
    }

    // Check duplicate code
    const existingService = await prisma.service.findUnique({
      where: { code },
    });

    if (existingService) {
      return NextResponse.json(
        {
          success: false,
          message: "A service with this code already exists.",
        },
        { status: 409 }
      );
    }

    // Check category
    const category = await prisma.servicecategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Service category not found." },
        { status: 404 }
      );
    }

    // Create service
    const service = await prisma.service.create({
      data: {
        code,
        name,
        description: description || null,
        categoryId,
        taxId,
        basePrice,
        paperCost,
        tonerCost,
        machineCost,
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

    const totalCost = paperCost + tonerCost + machineCost;
    const netProfit = basePrice - totalCost;

    return NextResponse.json(
      {
        success: true,
        message: "Service created successfully.",
        data: {
          ...service,
          basePrice: Number(service.basePrice),
          paperCost: Number(service.paperCost),
          tonerCost: Number(service.tonerCost),
          machineCost: Number(service.machineCost),
          totalCost,
          netProfit,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE SERVICE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create service.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - Update service with Cost & Selling Price
// Permission: SERVICE_UPDATE
// ============================================================

export async function PUT(request: Request) {
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

    const allowed = await hasPermission("SERVICE_UPDATE");

    if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to update services.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const id = Number(body.id);
    const code =
      typeof body.code === "string" ? body.code.trim() : "";
    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : null;
    const categoryId = Number(body.categoryId);
    const taxId =
      body.taxId === null ||
      body.taxId === undefined ||
      body.taxId === ""
        ? null
        : Number(body.taxId);

    const basePrice = Number(body.basePrice);
    const paperCost =
      body.paperCost !== undefined && body.paperCost !== null
        ? Math.max(0, Number(body.paperCost))
        : 0;
    const tonerCost =
      body.tonerCost !== undefined && body.tonerCost !== null
        ? Math.max(0, Number(body.tonerCost))
        : 0;
    const machineCost =
      body.machineCost !== undefined && body.machineCost !== null
        ? Math.max(0, Number(body.machineCost))
        : 0;

    const status =
      body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";

    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "Valid service ID is required." },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { success: false, message: "Service code is required." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Service name is required." },
        { status: 400 }
      );
    }

    if (Number.isNaN(basePrice) || basePrice < 0) {
      return NextResponse.json(
        { success: false, message: "Valid base price is required." },
        { status: 400 }
      );
    }

    // Check existing
    const existing = await prisma.service.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Service not found." },
        { status: 404 }
      );
    }

    // Check duplicate code
    const duplicateCode = await prisma.service.findFirst({
      where: {
        code,
        NOT: { id },
      },
    });

    if (duplicateCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Another service with this code already exists.",
        },
        { status: 409 }
      );
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        code,
        name,
        description: description || null,
        categoryId,
        taxId,
        basePrice,
        paperCost,
        tonerCost,
        machineCost,
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

    const totalCost = paperCost + tonerCost + machineCost;
    const netProfit = basePrice - totalCost;

    return NextResponse.json({
      success: true,
      message: "Service updated successfully.",
      data: {
        ...service,
        basePrice: Number(service.basePrice),
        paperCost: Number(service.paperCost),
        tonerCost: Number(service.tonerCost),
        machineCost: Number(service.machineCost),
        totalCost,
        netProfit,
      },
    });
  } catch (error) {
    console.error("UPDATE SERVICE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update service.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE - Delete or deactivate service
// Permission: SERVICE_DELETE
// ============================================================

export async function DELETE(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const allowed = await hasPermission("SERVICE_DELETE");

    if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to delete services.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "Valid service ID is required." },
        { status: 400 }
      );
    }

    const existing = await prisma.service.findUnique({
      where: { id },
      include: {
        _count: {
          select: { saleitem: true, jobitem: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Service not found." },
        { status: 404 }
      );
    }

    // If service has been sold or used in jobs, soft-deactivate instead of hard delete
    if (existing._count.saleitem > 0 || existing._count.jobitem > 0) {
      await prisma.service.update({
        where: { id },
        data: { status: "INACTIVE", updatedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message:
          "Service has existing sales records, so it was set to Inactive.",
      });
    }

    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Service deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE SERVICE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete service.",
      },
      { status: 500 }
    );
  }
}
