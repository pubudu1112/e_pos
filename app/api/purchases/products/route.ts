import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    const allowed = await hasPermission("PURCHASE_VIEW");
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to view purchase products.",
        },
        { status: 403 }
      );
    }

    const products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        purchasePrice: true,
        sellingPrice: true,
        brand: { select: { name: true } },
        stock: { select: { quantity: true } },
      },
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("GET PURCHASE PRODUCTS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load purchase products." },
      { status: 500 }
    );
  }
}
