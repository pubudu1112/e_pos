import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Current Inventory
export async function GET() {
  try {
    // ---------------------------------------------------------
    // Get all active products
    // ---------------------------------------------------------

    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
      },

      orderBy: {
        name: "asc",
      },

      include: {
        category: true,
        brand: true,
        unit: true,
        stock: true,
      },
    });

    // ---------------------------------------------------------
    // Format Inventory
    // ---------------------------------------------------------

    const data = products.map((product) => {
      const quantity = product.stock
        ? Number(product.stock.quantity)
        : 0;

      const reservedQuantity = product.stock
        ? Number(product.stock.reservedQuantity)
        : 0;

      const availableQuantity =
        quantity - reservedQuantity;

      const minimumStock =
        Number(product.minimumStock);

      let status = "IN_STOCK";

      if (quantity <= 0) {
        status = "OUT_OF_STOCK";
      } else if (quantity <= minimumStock) {
        status = "LOW_STOCK";
      }

      return {
        // If stock record exists use its ID.
        // Otherwise use product ID temporarily.
        id: product.stock?.id ?? product.id,

        productId: product.id,

        product: {
          id: product.id,
          code: product.code,
          barcode: product.barcode,
          name: product.name,

          category:
            product.category?.name ?? "",

          brand:
            product.brand?.name ?? "",

          unit:
            product.unit?.shortName ?? "",
        },

        quantity,
        reservedQuantity,
        availableQuantity,
        minimumStock,

        status,

        updatedAt:
          product.stock?.updatedAt ??
          product.updatedAt,
      };
    });

    // ---------------------------------------------------------
    // Response
    // ---------------------------------------------------------

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "GET INVENTORY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load inventory.",
      },
      { status: 500 }
    );
  }
}