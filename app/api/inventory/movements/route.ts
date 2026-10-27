import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Stock Movement History
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const productIdParam = searchParams.get("productId");
    const typeParam = searchParams.get("type");
    const search = searchParams.get("search")?.trim() || "";

    // ---------------------------------------------------------
    // Validate Product ID
    // ---------------------------------------------------------

    let productId: number | undefined = undefined;

    if (productIdParam) {
      const parsedProductId = Number(productIdParam);

      if (
        !Number.isInteger(parsedProductId) ||
        parsedProductId <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid product ID.",
          },
          { status: 400 }
        );
      }

      productId = parsedProductId;
    }

    // ---------------------------------------------------------
    // Validate Movement Type
    // ---------------------------------------------------------

    const validMovementTypes = [
      "PURCHASE",
      "SALE",
      "SALE_RETURN",
      "PURCHASE_RETURN",
      "ADJUSTMENT",
      "DAMAGE",
      "OPENING_STOCK",
      "JOB_CONSUMPTION",
    ] as const;

    let movementType:
      | (typeof validMovementTypes)[number]
      | undefined = undefined;

    if (typeParam) {
      if (
        !validMovementTypes.includes(
          typeParam as (typeof validMovementTypes)[number]
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid stock movement type.",
          },
          { status: 400 }
        );
      }

      movementType =
        typeParam as (typeof validMovementTypes)[number];
    }

    // ---------------------------------------------------------
    // Build Where Condition
    // ---------------------------------------------------------

    const where: any = {};

    if (productId !== undefined) {
      where.productId = productId;
    }

    if (movementType !== undefined) {
      where.type = movementType;
    }

    if (search) {
      where.OR = [
        {
          referenceId: {
            contains: search,
          },
        },
        {
          note: {
            contains: search,
          },
        },
        {
          product: {
            name: {
              contains: search,
            },
          },
        },
        {
          product: {
            code: {
              contains: search,
            },
          },
        },
      ];
    }

    // ---------------------------------------------------------
    // Get Stock Movements
    // ---------------------------------------------------------

    const movements =
      await prisma.stockmovement.findMany({
        where,

        orderBy: {
          createdAt: "desc",
        },

        take: 200,

        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              barcode: true,

              unit: {
                select: {
                  shortName: true,
                },
              },
            },
          },
        },
      });

    // ---------------------------------------------------------
    // Format Response
    // ---------------------------------------------------------

    const data = movements.map((movement) => ({
      id: movement.id.toString(),

      productId: movement.productId,

      product: {
        id: movement.product.id,
        code: movement.product.code,
        name: movement.product.name,
        barcode: movement.product.barcode,
        unit:
          movement.product.unit?.shortName ?? "",
      },

      type: movement.type,

      quantity: Number(movement.quantity),

      referenceId: movement.referenceId,

      note: movement.note,

      createdAt: movement.createdAt,
    }));

    // ---------------------------------------------------------
    // Success Response
    // ---------------------------------------------------------

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "GET STOCK MOVEMENTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load stock movements.",
      },
      { status: 500 }
    );
  }
}