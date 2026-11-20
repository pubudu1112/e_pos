import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth/authorize";

// GET - POS Customers
export async function GET(request: Request) {
  try {
    const auth = await authorize(["POS_VIEW", "POS_CREATE_SALE"]);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);

    const search =
      (searchParams.get("search")?.trim() || "").slice(0, 100);
    const rawPage = Number(searchParams.get("page") || 1);
    const page = Number.isSafeInteger(rawPage) ? Math.max(1, Math.min(rawPage, 10000)) : 1;
    const pageSize = 50;
    const where = {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, code: true, name: true, phone: true },
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: { page, pageSize, total, hasMore: page * pageSize < total },
    });
  } catch (error) {
    console.error(
      "GET POS CUSTOMERS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load customers.",
      },
      { status: 500 }
    );
  }
}

// POST - Quick Create Customer for POS
export async function POST(request: Request) {
  try {
    const auth = await authorize(["POS_CREATE_SALE", "CUSTOMER_CREATE"]);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;
    const email = typeof body.email === "string" ? body.email.trim() : null;

    if (!name || name.length > 150 || (phone?.length ?? 0) > 30 || (email?.length ?? 0) > 150) {
      return NextResponse.json(
        { success: false, message: "Customer details are invalid." },
        { status: 400 }
      );
    }


    // Generate next customer code safely
    const existingCustomers = await prisma.customer.findMany({
      where: { code: { startsWith: "CUST-" } },
      select: {
        code: true,
      },
      orderBy: { id: "desc" },
      take: 100,
    });

    const lastNumber = existingCustomers.reduce((max, customer) => {
      const match = /^CUST-(\d+)$/i.exec(customer.code);

      if (!match) return max;

      return Math.max(max, Number(match[1]));
    }, 0);

    const code = `CUST-${String(lastNumber + 1).padStart(4, "0")}`;


    const newCustomer = await prisma.customer.create({
      data: {
        code,
        name,
        phone,
        email,
        isActive: true,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer added successfully.",
      data: newCustomer,
    });
  } catch (error) {
    console.error("CREATE POS CUSTOMER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create customer." },
      { status: 500 }
    );
  }
}
