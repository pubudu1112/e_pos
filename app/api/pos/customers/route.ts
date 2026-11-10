import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - POS Customers
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search =
      searchParams.get("search")?.trim() || "";

    const customers = await prisma.customer.findMany({
      where: {
        ...(search
          ? {
            OR: [
              {
                name: {
                  contains: search,
                },
              },
              {
                code: {
                  contains: search,
                },
              },
              {
                phone: {
                  contains: search,
                },
              },
            ],
          }
          : {}),
      },

      orderBy: {
        name: "asc",
      },

      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: customers,
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
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;
    const email = typeof body.email === "string" ? body.email.trim() : null;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Customer name is required." },
        { status: 400 }
      );
    }

    // Generate unique customer code
    // Generate next customer code safely
    const lastCustomer = await prisma.customer.findFirst({
      where: {
        code: {
          startsWith: "CUST-",
        },
      },
      orderBy: {
        id: "desc",
      },
      select: {
        code: true,
      },
    });

    const lastNumber = lastCustomer
      ? Number(lastCustomer.code.replace("CUST-", ""))
      : 0;

    const nextNumber = lastNumber + 1;

    const code = `CUST-${String(nextNumber).padStart(4, "0")}`;

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
        email: true,
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