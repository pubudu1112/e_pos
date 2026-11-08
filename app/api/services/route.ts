import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// ============================================================
// DEFAULT SERVICES SEED (Photocopy, Printing, Binding, Laminating)
// ============================================================

const DEFAULT_PRINTING_SERVICES = [
  // --- PHOTOCOPY SERVICES ---
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

  // --- COLOR PRINTING SERVICES ---
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

  // --- BINDING SERVICES (Spine/Spiral Material + Cover Sheets + Punch & Labor) ---
  {
    code: "SRV-BND-SP-SM",
    name: "A4 Spiral Binding (Small: 1-50 pages)",
    description: "Spiral wire/plastic coil with clear PVC front and card back cover",
    categoryName: "Binding",
    basePrice: 150.0,
    paperCost: 25.0, // Spiral Ring coil
    tonerCost: 30.0, // Front PVC sheet + Back Board
    machineCost: 15.0, // Punch machine & Labor
  },
  {
    code: "SRV-BND-SP-MD",
    name: "A4 Spiral Binding (Medium: 51-150 pages)",
    description: "Medium spiral wire/plastic coil with clear PVC front and card back cover",
    categoryName: "Binding",
    basePrice: 250.0,
    paperCost: 45.0, // Spiral Ring
    tonerCost: 35.0, // Heavy Front PVC + Back Board
    machineCost: 20.0, // Punch & Labor
  },
  {
    code: "SRV-BND-SP-LG",
    name: "A4 Spiral Binding (Large: 151-300 pages)",
    description: "Large heavy-duty spiral coil binding for reports & manuals",
    categoryName: "Binding",
    basePrice: 400.0,
    paperCost: 75.0, // Large Spiral Ring
    tonerCost: 40.0, // Premium Cover sheets
    machineCost: 25.0, // Machine & Labor
  },
  {
    code: "SRV-BND-COMB",
    name: "Plastic Comb Binding (A4 Standard)",
    description: "Plastic comb spine binding with transparent front cover",
    categoryName: "Binding",
    basePrice: 180.0,
    paperCost: 30.0, // Comb spine
    tonerCost: 30.0, // Front PVC + Back Board
    machineCost: 15.0, // Machine wear & Labor
  },
  {
    code: "SRV-BND-TAPE",
    name: "Tape / Strip Binding (A4 Fast Binding)",
    description: "Thermal or pressure spine cloth tape binding",
    categoryName: "Binding",
    basePrice: 120.0,
    paperCost: 15.0, // Spine cloth tape
    tonerCost: 30.0, // Front PVC + Back Board
    machineCost: 10.0, // Labor
  },
  {
    code: "SRV-BND-HARD",
    name: "Hard Cover Project / Thesis Book Binding",
    description: "Deluxe hardcover book binding with gold embossed foil lettering",
    categoryName: "Binding",
    basePrice: 1200.0,
    paperCost: 350.0, // Hardcover board, gold foil lettering
    tonerCost: 120.0, // Inner stitching tapes, endpapers & glue
    machineCost: 130.0, // Machine press wear & technician labor
  },

  // --- LAMINATING SERVICES (Film Pouch + Heat/Electric + Machine) ---
  {
    code: "SRV-LAM-A4",
    name: "A4 Document Laminating",
    description: "Heavy 100-micron thermal lamination for A4 certificates and documents",
    categoryName: "Laminating",
    basePrice: 80.0,
    paperCost: 25.0, // A4 Laminating pouch film
    tonerCost: 8.0, // Electricity & heat
    machineCost: 5.0, // Machine wear
  },
  {
    code: "SRV-LAM-A3",
    name: "A3 Poster / Chart Laminating",
    description: "Heavy thermal lamination for large format A3 documents",
    categoryName: "Laminating",
    basePrice: 150.0,
    paperCost: 50.0, // A3 pouch film
    tonerCost: 15.0, // Electricity & heat
    machineCost: 10.0, // Machine wear
  },
  {
    code: "SRV-LAM-ID",
    name: "ID Card / Badge Laminating",
    description: "Compact high-gloss pouch lamination for ID cards and badges",
    categoryName: "Laminating",
    basePrice: 40.0,
    paperCost: 8.0, // ID pouch
    tonerCost: 3.0, // Heat & electricity
    machineCost: 2.0, // Machine wear
  },

  // --- SCANNING SERVICES ---
  {
    code: "SRV-SCN-DOC",
    name: "Document Scanning to PDF / Email (per page)",
    description: "High-resolution optical scanning sent to email or saved to USB",
    categoryName: "Scanning",
    basePrice: 30.0,
    paperCost: 0.0,
    tonerCost: 5.0, // Cloud / digital storage & bandwidth
    machineCost: 5.0, // Scanner lamp & feeder wear
  },
];


// ============================================================
// COST COMPONENT VALIDATION
// ============================================================

type NormalizedCostComponent = {
  costType: "INVENTORY" | "MANUAL";
  name: string;
  productId: number | null;
  quantity: number;
  cost: number;
};

async function validateCostComponents(
  rawComponents: unknown
): Promise<{ data?: NormalizedCostComponent[]; error?: string }> {
  if (rawComponents === undefined || rawComponents === null) {
    return { data: [] };
  }

  if (!Array.isArray(rawComponents)) {
    return { error: "Cost components must be an array." };
  }

  const normalized: NormalizedCostComponent[] = [];
  const inventoryProductIds: number[] = [];

  for (let index = 0; index < rawComponents.length; index++) {
    const component = rawComponents[index];

    if (!component || typeof component !== "object") {
      return { error: `Invalid cost component at row ${index + 1}.` };
    }

    const costType = component.costType;
    const name = typeof component.name === "string" ? component.name.trim() : "";
    const cost = Number(component.cost);

    if (costType !== "INVENTORY" && costType !== "MANUAL") {
      return { error: `Invalid cost type at row ${index + 1}.` };
    }
    if (!name) {
      return { error: `Cost component name is required at row ${index + 1}.` };
    }
    if (!Number.isFinite(cost) || cost < 0) {
      return { error: `Valid non-negative cost is required at row ${index + 1}.` };
    }

    if (costType === "INVENTORY") {
      const productId = Number(component.productId);
      const quantity = Number(component.quantity);

      if (!Number.isInteger(productId) || productId <= 0) {
        return { error: `Select a valid inventory product at row ${index + 1}.` };
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return { error: `Quantity must be greater than zero at row ${index + 1}.` };
      }

      inventoryProductIds.push(productId);
      normalized.push({ costType, name, productId, quantity, cost });
    } else {
      normalized.push({ costType, name, productId: null, quantity: 1, cost });
    }
  }

  const uniqueProductIds = [...new Set(inventoryProductIds)];
  if (uniqueProductIds.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds }, status: "ACTIVE" },
      select: { id: true },
    });

    const validIds = new Set(products.map((product) => product.id));
    const missingId = uniqueProductIds.find((id) => !validIds.has(id));
    if (missingId !== undefined) {
      return { error: `Inventory product ID ${missingId} was not found or is inactive.` };
    }
  }

  return { data: normalized };
}

function parseNonNegativeCost(value: unknown, fieldName: string): number {
  const parsed =
    value === undefined || value === null || value === "" ? 0 : Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a valid non-negative number.`);
  }
  return parsed;
}

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

    const [services, inventoryProducts] = await Promise.all([
      prisma.service.findMany({
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
          costComponents: {
  include: {
    product: {
      select: {
        id: true,
        code: true,
        name: true,
      },
    },
  },
},
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.product.findMany({
        where: {
          status: "ACTIVE",
        },
        select: {
          id: true,
          code: true,
          name: true,
          sellingPrice: true,
          purchasePrice: true,
          stock: {
            select: {
              quantity: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

   const enrichedServices = services.map((s) => {
  const basePrice = Number(s.basePrice || 0);

  const costComponents = s.costComponents.map((c) => ({
    id: String(c.id),
    costType: c.costType,
    name: c.name,
    cost: Number(c.unitCost),
    productId: c.productId,
    productName: c.product?.name ?? null,
    quantity: Number(c.quantity),
  }));

  const inventoryCost = costComponents
    .filter((c) => c.costType === "INVENTORY")
    .reduce((sum, c) => sum + c.cost * c.quantity, 0);

  const manualCost = costComponents
    .filter((c) => c.costType === "MANUAL")
    .reduce((sum, c) => sum + c.cost, 0);

  const totalCost = inventoryCost + manualCost;

  const netProfit = basePrice - totalCost;

  return {
    ...s,
    description: s.description,
    costComponents,
    inventoryCost,
    manualCost,
    totalCost,
    netProfit,
    marginPercent:
      basePrice > 0
        ? Math.round((netProfit / basePrice) * 1000) / 10
        : 0,
    basePrice,
    paperCost: Number(s.paperCost || 0),
    tonerCost: Number(s.tonerCost || 0),
    machineCost: Number(s.machineCost || 0),
  };
});

    return NextResponse.json({
      success: true,
      data: enrichedServices,
      inventoryProducts: inventoryProducts.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        sellingPrice: Number(p.sellingPrice),
        purchasePrice: Number(p.purchasePrice ?? 0),
        stockQty: p.stock ? Number(p.stock.quantity) : 0,
      })),
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
    // Legacy cost columns are retained for database compatibility.
    // New service costs are maintained only through Inventory and Manual components.
    const paperCost = 0;
    const tonerCost = 0;
    const machineCost = 0;

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

    if (taxId !== null) {
      if (!Number.isInteger(taxId) || taxId <= 0) {
        return NextResponse.json(
          { success: false, message: "Valid tax ID is required." },
          { status: 400 }
        );
      }

      const tax = await prisma.tax.findUnique({
        where: { id: taxId },
        select: { id: true },
      });

      if (!tax) {
        return NextResponse.json(
          { success: false, message: "Tax record not found." },
          { status: 404 }
        );
      }
    }

// Create service with Cost Components
const validatedComponents = await validateCostComponents(body.costComponents);

if (validatedComponents.error) {
  return NextResponse.json(
    { success: false, message: validatedComponents.error },
    { status: 400 }
  );
}

const costComponents = validatedComponents.data ?? [];

const service = await prisma.service.create({
  data: {
    code,
    name,
    description,
    categoryId,
    taxId,
    basePrice,
    paperCost,
    tonerCost,
    machineCost,
    status: "ACTIVE",
    updatedAt: new Date(),

    // Save cost components into ServiceCostComponent table
    costComponents: {
      create: costComponents.map((c: any) => ({
        costType: c.costType,
        name: String(c.name || "").trim(),
        productId:
          c.costType === "INVENTORY" && c.productId
            ? Number(c.productId)
            : null,
        quantity:
          c.costType === "INVENTORY"
            ? Math.max(0, Number(c.quantity) || 0)
            : 1,
        unitCost: Math.max(0, Number(c.cost) || 0),
      })),
    },
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
    costComponents: {
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    },
  },
});

// Calculate Inventory Cost
const inventoryCost = costComponents
  .filter((c: any) => c.costType === "INVENTORY")
  .reduce(
    (sum: number, c: any) =>
      sum +
      (Math.max(0, Number(c.cost)) || 0) *
        (Math.max(0, Number(c.quantity)) || 0),
    0
  );

// Calculate Manual Cost
const manualCost = costComponents
  .filter((c: any) => c.costType === "MANUAL")
  .reduce(
    (sum: number, c: any) =>
      sum + (Math.max(0, Number(c.cost)) || 0),
    0
  );

// Total cost is based only on Inventory and Manual components.
const totalCost = inventoryCost + manualCost;

// Profit Calculation
const netProfit = basePrice - totalCost;

const marginPercent =
  basePrice > 0
    ? (netProfit / basePrice) * 100
    : 0;

// Return Response
return NextResponse.json(
  {
    success: true,
    message: "Service created successfully.",
    data: {
      ...service,

      description: description || null,

      costComponents: service.costComponents.map((c) => ({
        id: String(c.id),
        costType: c.costType,
        name: c.name,
        productId: c.productId,
        productName: c.product?.name ?? null,
        quantity: Number(c.quantity),
        cost: Number(c.unitCost),
      })),

      basePrice: Number(service.basePrice),
      paperCost: Number(service.paperCost),
      tonerCost: Number(service.tonerCost),
      machineCost: Number(service.machineCost),

      inventoryCost,
      manualCost,
      totalCost,
      netProfit,
      marginPercent: Math.round(marginPercent * 10) / 10,
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
    // Legacy cost columns are retained for database compatibility.
    // New service costs are maintained only through Inventory and Manual components.
    const paperCost = 0;
    const tonerCost = 0;
    const machineCost = 0;

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

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json(
        { success: false, message: "Valid service category is required." },
        { status: 400 }
      );
    }

    const category = await prisma.servicecategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Service category not found." },
        { status: 404 }
      );
    }

    if (taxId !== null) {
      if (!Number.isInteger(taxId) || taxId <= 0) {
        return NextResponse.json(
          { success: false, message: "Valid tax ID is required." },
          { status: 400 }
        );
      }

      const tax = await prisma.tax.findUnique({
        where: { id: taxId },
        select: { id: true },
      });

      if (!tax) {
        return NextResponse.json(
          { success: false, message: "Tax record not found." },
          { status: 404 }
        );
      }
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

    // Replace components only when explicitly supplied.
    // This protects saved components during status-only updates.
    let costComponents: NormalizedCostComponent[] | undefined;

    if (body.costComponents !== undefined) {
      const validatedComponents = await validateCostComponents(body.costComponents);

      if (validatedComponents.error) {
        return NextResponse.json(
          { success: false, message: validatedComponents.error },
          { status: 400 }
        );
      }

      costComponents = validatedComponents.data ?? [];
    }

// Update Service with Cost Components
const service = await prisma.service.update({
  where: { id },
  data: {
    code,
    name,
    description,
    categoryId,
    taxId,
    basePrice,
    paperCost,
    tonerCost,
    machineCost,
    status,
    updatedAt: new Date(),

    ...(costComponents !== undefined
      ? {
          costComponents: {
            deleteMany: {},
            create: costComponents.map((c) => ({
              costType: c.costType,
              name: c.name,
              productId: c.costType === "INVENTORY" ? c.productId : null,
              quantity: c.costType === "INVENTORY" ? c.quantity : 1,
              unitCost: c.cost,
            })),
          },
        }
      : {}),
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

    costComponents: {
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    },
  },
});

    const effectiveCostComponents =
      costComponents ??
      service.costComponents.map((component) => ({
        costType: component.costType,
        name: component.name,
        productId: component.productId,
        quantity: Number(component.quantity),
        cost: Number(component.unitCost),
      }));

    const inventoryCost = effectiveCostComponents
  .filter((c) => c.costType === "INVENTORY")
  .reduce(
    (sum: number, c: any) => {
      const unitCost = Math.max(0, Number(c.cost) || 0);
      const quantity = Math.max(0, Number(c.quantity) || 0);

      return sum + unitCost * quantity;
    },
    0
  );

const manualCost = effectiveCostComponents
  .filter((c: any) => c.costType === "MANUAL")
  .reduce(
    (sum: number, c: any) => {
      const cost = Math.max(0, Number(c.cost) || 0);

      return sum + cost;
    },
    0
  );

const totalCost = inventoryCost + manualCost;

const netProfit = basePrice - totalCost;

const marginPercent =
  basePrice > 0
    ? (netProfit / basePrice) * 100
    : 0;

   return NextResponse.json({
  success: true,
  message: "Service updated successfully.",
  data: {
    ...service,

    description: description || null,

    costComponents: service.costComponents.map((c) => ({
      id: String(c.id),
      costType: c.costType,
      name: c.name,
      productId: c.productId,
      productName: c.product?.name ?? null,
      quantity: Number(c.quantity),
      cost: Number(c.unitCost),
    })),

    basePrice: Number(service.basePrice),
    paperCost: Number(service.paperCost),
    tonerCost: Number(service.tonerCost),
    machineCost: Number(service.machineCost),

    inventoryCost,
    manualCost,
    totalCost,
    netProfit,
    marginPercent: Math.round(marginPercent * 10) / 10,
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
