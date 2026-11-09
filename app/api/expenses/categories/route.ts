import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

const DEFAULT_CATEGORIES = [
  { name: "Rent & Utilities", description: "Shop rental, electricity, water, and waste management" },
  { name: "Printing & Paper Supplies", description: "Paper reams, banner rolls, toner, cartridges, and inks" },
  { name: "Stationery & Consumables", description: "Pens, laminating sheets, spiral rings, binders, clips" },
  { name: "Mobile Accessories Stock", description: "Cables, chargers, tempered glass, cases, earphones" },
  { name: "Machine Maintenance & Repair", description: "Photocopy and printing machine servicing, spare parts" },
  { name: "Staff Salaries & Allowances", description: "Staff monthly pay, overtime, and daily allowances" },
  { name: "Internet & Telecom", description: "Fiber internet, shop phone lines, and data packages" },
  { name: "Tea & Refreshments", description: "Daily customer/staff tea, drinking water, and snacks" },
  { name: "Marketing & Transport", description: "Flyers, deliveries, courier charges, and fuel" },
  { name: "Miscellaneous", description: "Other general day-to-day minor shop expenses" },
];


export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Load categories directly from database.
    // No default category seeding.
    const categories = await prisma.expensecategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            expense: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("GET EXPENSE CATEGORIES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load expense categories",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Category name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.expensecategory.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "A category with this name already exists" },
        { status: 400 }
      );
    }

    const newCategory = await prisma.expensecategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Expense category created successfully",
      data: newCategory,
    });
  } catch (error) {
    console.error("CREATE EXPENSE CATEGORY ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create expense category" },
      { status: 500 }
    );
  }
}

