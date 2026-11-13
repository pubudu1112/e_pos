import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// GET - List customers with search, stats & pagination

export async function GET(request: Request) {
  try {
    console.log("CUSTOMER API: Step 1 - Starting");

    const session = await getSession();

    console.log("CUSTOMER API: Step 2 - Session checked", !!session);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("CUSTOMER API: Step 3 - Loading customers");

    const customers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            sale: true,
            job: true,
          },
        },
      },
    });

    console.log("CUSTOMER API: Step 4 - Customers loaded", customers.length);

    const totalCount = await prisma.customer.count();

    console.log("CUSTOMER API: Step 5 - Total count", totalCount);

    const activeCount = await prisma.customer.count({
      where: { isActive: true },
    });

    console.log("CUSTOMER API: Step 6 - Active count", activeCount);

    return NextResponse.json({
      success: true,
      data: customers.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        phone: c.phone || "",
        email: c.email || "",
        address: c.address || "",
        creditLimit: Number(c.creditLimit),
        openingBalance: Number(c.openingBalance),
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        salesCount: c._count.sale,
        jobsCount: c._count.job,
      })),
      stats: {
        totalCustomers: totalCount,
        activeCustomers: activeCount,
        inactiveCustomers: totalCount - activeCount,
        totalReceivables: customers.reduce(
          (sum, c) => sum + Number(c.openingBalance || 0),
          0
        ),
      },
    });
  } catch (error) {
    console.error("CUSTOMER API DEBUG ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch customers",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}


// POST - Create a new customer
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const allowed = await hasPermission("CUSTOMER_CREATE");
    if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, message: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;
    const email = typeof body.email === "string" ? body.email.trim() : null;
    const address = typeof body.address === "string" ? body.address.trim() : null;
    const creditLimit = Math.max(0, Number(body.creditLimit) || 0);
    const openingBalance = Number(body.openingBalance) || 0;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Customer name is required" },
        { status: 400 }
      );
    }

    // Generate next customer code if not provided
    let code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!code) {
      const count = await prisma.customer.count();
      code = `CUST-${String(count + 1).padStart(4, "0")}`;
    }

    // Check duplicate code
    const existing = await prisma.customer.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Customer with code ${code} already exists.` },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        code,
        name,
        phone,
        email,
        address,
        creditLimit,
        openingBalance,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        updatedAt: new Date(),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CUSTOMER_CREATE",
        entity: "customer",
        entityId: String(customer.id),
        details: JSON.stringify({ name: customer.name, code: customer.code }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("CREATE CUSTOMER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create customer" },
      { status: 500 }
    );
  }
}

