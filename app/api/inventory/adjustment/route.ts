import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateAdjustmentNo() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `ADJ-${year}${month}${day}-${random}`;
}

// POST - Create Stock Adjustment
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productId = Number(body.productId);
    const quantity = Number(body.quantity);

    const type =
      body.type === "OUT" ? "OUT" : "IN";

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    const note =
      typeof body.note === "string"
        ? body.note.trim()
        : "";

    // ---------------------------------------------------------
    // Validation
    // ---------------------------------------------------------

    if (
      !Number.isInteger(productId) ||
      productId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid product is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Quantity must be greater than 0.",
        },
        { status: 400 }
      );
    }

    if (quantity > 999999999) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity is too large.",
        },
        { status: 400 }
      );
    }

    if (reason.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Reason cannot exceed 255 characters.",
        },
        { status: 400 }
      );
    }

    if (note.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Note cannot exceed 255 characters.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // Check Product
    // ---------------------------------------------------------

    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------
    // Check Login
    // ---------------------------------------------------------

    const { getSession } = await import(
      "@/lib/auth/session"
    );

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be logged in to adjust stock.",
        },
        { status: 401 }
      );
    }

    const createdById = session.user.id;

    // ---------------------------------------------------------
    // Transaction
    // ---------------------------------------------------------

    const result = await prisma.$transaction(
      async (tx) => {
        // Find stock
        let stock =
          await tx.stock.findUnique({
            where: {
              productId,
            },
          });

        // Create stock record if it doesn't exist
        if (!stock) {
          stock = await tx.stock.create({
            data: {
              productId,
              quantity: 0,
              reservedQuantity: 0,
              updatedAt: new Date(),
            },
          });
        }

        const currentQuantity =
          Number(stock.quantity);

        // -----------------------------------------------------
        // Prevent negative stock
        // -----------------------------------------------------

        if (
          type === "OUT" &&
          quantity > currentQuantity
        ) {
          throw new Error(
            `INSUFFICIENT_STOCK:${currentQuantity}`
          );
        }

        // -----------------------------------------------------
        // Calculate new stock
        // -----------------------------------------------------

        const newQuantity =
          type === "IN"
            ? currentQuantity + quantity
            : currentQuantity - quantity;

        // -----------------------------------------------------
        // Generate Adjustment Number
        // -----------------------------------------------------

        let adjustmentNo =
          generateAdjustmentNo();

        let existingAdjustment =
          await tx.stockadjustment.findUnique({
            where: {
              adjustmentNo,
            },
          });

        while (existingAdjustment) {
          adjustmentNo =
            generateAdjustmentNo();

          existingAdjustment =
            await tx.stockadjustment.findUnique({
              where: {
                adjustmentNo,
              },
            });
        }

        // -----------------------------------------------------
        // Create Adjustment Header
        // -----------------------------------------------------

        const adjustment =
          await tx.stockadjustment.create({
            data: {
              adjustmentNo,
              reason: reason || null,
              createdById,
            },
          });

        // -----------------------------------------------------
        // Create Adjustment Item
        // -----------------------------------------------------

        const adjustmentQuantity =
          type === "IN"
            ? quantity
            : -quantity;

        await tx.stockadjustmentitem.create({
          data: {
            adjustmentId: adjustment.id,
            productId,
            quantity: adjustmentQuantity,
            note: note || null,
          },
        });

        // -----------------------------------------------------
        // Update Stock
        // -----------------------------------------------------

        const updatedStock =
          await tx.stock.update({
            where: {
              productId,
            },
            data: {
              quantity: newQuantity,
              updatedAt: new Date(),
            },
          });

        // -----------------------------------------------------
        // Create Stock Movement
        // -----------------------------------------------------

        const movement =
          await tx.stockmovement.create({
            data: {
              productId,
              type: "ADJUSTMENT",
              quantity: quantity,
              referenceId: adjustmentNo,
              note: note || reason || null,
            },
          });

        // -----------------------------------------------------
        // IMPORTANT:
        // Do not return Prisma BigInt directly.
        // Convert movement.id to string.
        // -----------------------------------------------------

        return {
          adjustmentId: adjustment.id,
          adjustmentNo:
            adjustment.adjustmentNo,

          productId,

          previousQuantity:
            currentQuantity,

          adjustmentQuantity:
            quantity,

          newQuantity,

          movementId:
            movement.id.toString(),

          type,
        };
      }
    );

    // ---------------------------------------------------------
    // Success Response
    // ---------------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        message:
          type === "IN"
            ? "Stock increased successfully."
            : "Stock decreased successfully.",

        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE STOCK ADJUSTMENT ERROR:",
      error
    );

    // ---------------------------------------------------------
    // Insufficient Stock
    // ---------------------------------------------------------

    if (
      error instanceof Error &&
      error.message.startsWith(
        "INSUFFICIENT_STOCK:"
      )
    ) {
      const currentStock =
        error.message.split(":")[1] ?? "0";

      return NextResponse.json(
        {
          success: false,
          message: `Insufficient stock. Current stock is ${currentStock}.`,
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // General Error
    // ---------------------------------------------------------

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create stock adjustment.",
      },
      { status: 500 }
    );
  }
}