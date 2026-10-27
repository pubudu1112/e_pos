import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

type PurchaseItemInput = {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount?: number;
};

type CreatePurchaseInput = {
  supplierId: number;
  purchaseDate?: string;
  items: PurchaseItemInput[];
  discount?: number;
  tax?: number;
  paidAmount?: number;
  paymentMethodType?: string;
  paymentReference?: string;
  paymentNote?: string;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function generatePurchaseNo() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getDate()
  ).padStart(2, "0");

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `PUR-${year}${month}${day}-${random}`;
}

/* ============================================================
   GET PURCHASES
============================================================ */

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const allowed =
      await hasPermission("PURCHASE_VIEW");

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to view purchases.",
        },
        { status: 403 }
      );
    }

    const purchases =
      await prisma.purchase.findMany({
        orderBy: {
          purchaseDate: "desc",
        },

        include: {
          supplier: true,

          purchaseitem: {
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

          purchasepayment: {
            include: {
              paymentmethod: true,
            },
          },

          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      data: purchases,
    });
  } catch (error) {
    console.error(
      "GET PURCHASES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load purchases.",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   CREATE PURCHASE
============================================================ */

export async function POST(
  request: Request
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const allowed =
      await hasPermission("PURCHASE_CREATE");

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to create purchases.",
        },
        { status: 403 }
      );
    }

    const body =
      (await request.json()) as CreatePurchaseInput;

    const supplierId =
      Number(body.supplierId);

    const items = Array.isArray(body.items)
      ? body.items
      : [];

    const discount = roundMoney(
      Number(body.discount ?? 0)
    );

    const tax = roundMoney(
      Number(body.tax ?? 0)
    );

    const paidAmount = roundMoney(
      Number(body.paidAmount ?? 0)
    );

    if (
      !Number.isInteger(supplierId) ||
      supplierId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid supplier is required.",
        },
        { status: 400 }
      );
    }

    if (
      items.length === 0 ||
      items.length > 500
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "At least one purchase item is required.",
        },
        { status: 400 }
      );
    }

    if (
      discount < 0 ||
      tax < 0 ||
      paidAmount < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Discount, tax and paid amount cannot be negative.",
        },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (
        !Number.isInteger(
          Number(item.productId)
        ) ||
        Number(item.productId) <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid product in purchase items.",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isFinite(
          Number(item.quantity)
        ) ||
        Number(item.quantity) <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Purchase quantity must be greater than zero.",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isFinite(
          Number(item.unitPrice)
        ) ||
        Number(item.unitPrice) < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Purchase unit price cannot be negative.",
          },
          { status: 400 }
        );
      }

      if (
        Number(item.discount ?? 0) < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Item discount cannot be negative.",
          },
          { status: 400 }
        );
      }
    }

    const paymentMethodTypes = [
      "CASH",
      "CARD",
      "BANK_TRANSFER",
      "ONLINE",
      "CREDIT",
      "OTHER",
    ] as const;

    if (
      paidAmount > 0 &&
      !paymentMethodTypes.includes(
        body.paymentMethodType as
          (typeof paymentMethodTypes)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid payment method is required when making a payment.",
        },
        { status: 400 }
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          /* ==================================================
             SUPPLIER
          ================================================== */

          const supplier =
            await tx.supplier.findUnique({
              where: {
                id: supplierId,
              },
            });

          if (
            !supplier ||
            !supplier.isActive
          ) {
            throw new Error(
              "SUPPLIER_NOT_FOUND"
            );
          }

          /* ==================================================
             PURCHASE ITEMS
          ================================================== */

          const purchaseItems: Array<{
            productId: number;
            quantity: number;
            unitPrice: number;
            discount: number;
            total: number;
          }> = [];

          let subtotal = 0;

          for (const item of items) {
            const product =
              await tx.product.findUnique({
                where: {
                  id: Number(
                    item.productId
                  ),
                },

                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              });

            if (!product) {
              throw new Error(
                `PRODUCT_NOT_FOUND:${item.productId}`
              );
            }

            if (
              product.status !== "ACTIVE"
            ) {
              throw new Error(
                `PRODUCT_INACTIVE:${product.name}`
              );
            }

            const quantity =
              Number(item.quantity);

            const unitPrice =
              roundMoney(
                Number(item.unitPrice)
              );

            const itemDiscount =
              roundMoney(
                Number(
                  item.discount ?? 0
                )
              );

            const gross =
              roundMoney(
                quantity * unitPrice
              );

            if (
              itemDiscount > gross
            ) {
              throw new Error(
                `ITEM_DISCOUNT_EXCEEDED:${product.name}`
              );
            }

            const lineTotal =
              roundMoney(
                gross - itemDiscount
              );

            subtotal = roundMoney(
              subtotal + lineTotal
            );

            purchaseItems.push({
              productId: product.id,
              quantity,
              unitPrice,
              discount: itemDiscount,
              total: lineTotal,
            });
          }

          /* ==================================================
             TOTALS
          ================================================== */

          const totalBeforeDiscount =
            roundMoney(
              subtotal + tax
            );

          const finalDiscount =
            Math.min(
              discount,
              totalBeforeDiscount
            );

          const total = Math.max(
            0,
            roundMoney(
              totalBeforeDiscount -
                finalDiscount
            )
          );

          if (paidAmount > total) {
            throw new Error(
              "PAID_AMOUNT_EXCEEDED"
            );
          }

          const balanceAmount =
            roundMoney(
              total - paidAmount
            );

          let status:
            | "PENDING"
            | "PARTIAL"
            | "PAID";

          if (paidAmount >= total) {
            status = "PAID";
          } else if (paidAmount > 0) {
            status = "PARTIAL";
          } else {
            status = "PENDING";
          }

          /* ==================================================
             PURCHASE NUMBER
          ================================================== */

          let purchaseNo = "";
          let purchaseCreated = false;

          for (
            let attempt = 0;
            attempt < 10;
            attempt++
          ) {
            const candidate =
              generatePurchaseNo();

            const existing =
              await tx.purchase.findUnique({
                where: {
                  purchaseNo:
                    candidate,
                },

                select: {
                  id: true,
                },
              });

            if (!existing) {
              purchaseNo = candidate;
              purchaseCreated = true;
              break;
            }
          }

          if (!purchaseCreated) {
            throw new Error(
              "PURCHASE_NUMBER_GENERATION_FAILED"
            );
          }

          /* ==================================================
             PAYMENT METHOD
          ================================================== */

          let paymentMethod:
            | {
                id: number;
                name: string;
              }
            | null = null;

          if (paidAmount > 0) {
            paymentMethod =
              await tx.paymentmethod.findFirst(
                {
                  where: {
                    type:
                      body.paymentMethodType as
                        | "CASH"
                        | "CARD"
                        | "BANK_TRANSFER"
                        | "ONLINE"
                        | "CREDIT"
                        | "OTHER",

                    isActive: true,
                  },

                  select: {
                    id: true,
                    name: true,
                  },
                }
              );

            if (!paymentMethod) {
              throw new Error(
                "PAYMENT_METHOD_NOT_FOUND"
              );
            }
          }

          /* ==================================================
             CREATE PURCHASE
          ================================================== */

          const purchase =
            await tx.purchase.create({
              data: {
                purchaseNo,
                supplierId,
                createdById:
                  session.user.id,

                purchaseDate:
                  body.purchaseDate
                    ? new Date(
                        body.purchaseDate
                      )
                    : new Date(),

                subtotal,
                discount:
                  finalDiscount,
                tax,
                total,
                paidAmount,
                balanceAmount,
                status,
                updatedAt:
                  new Date(),
              },
            });

          /* ==================================================
             CREATE PURCHASE ITEMS
          ================================================== */

          for (const item of purchaseItems) {
            await tx.purchaseitem.create(
              {
                data: {
                  purchaseId:
                    purchase.id,

                  productId:
                    item.productId,

                  quantity:
                    item.quantity,

                  unitPrice:
                    item.unitPrice,

                  discount:
                    item.discount,

                  total:
                    item.total,
                },
              }
            );

            /* ================================================
               UPDATE STOCK
            ================================================ */

            await tx.stock.upsert({
              where: {
                productId:
                  item.productId,
              },

              create: {
                productId:
                  item.productId,

                quantity:
                  item.quantity,

                reservedQuantity: 0,

                updatedAt:
                  new Date(),
              },

              update: {
                quantity: {
                  increment:
                    item.quantity,
                },

                updatedAt:
                  new Date(),
              },
            });

            /* ================================================
               STOCK MOVEMENT
            ================================================ */

            await tx.stockmovement.create({
              data: {
                productId:
                  item.productId,

                type: "PURCHASE",

                quantity:
                  item.quantity,

                referenceId:
                  purchaseNo,

                note:
                  `Purchase ${purchaseNo}`,
              },
            });
          }

          /* ==================================================
             CREATE PAYMENT
          ================================================== */

          if (
            paidAmount > 0 &&
            paymentMethod
          ) {
            await tx.purchasepayment.create(
              {
                data: {
                  purchaseId:
                    purchase.id,

                  paymentMethodId:
                    paymentMethod.id,

                  amount:
                    paidAmount,

                  paymentDate:
                    new Date(),

                  reference:
                    body.paymentReference ||
                    purchaseNo,

                  note:
                    body.paymentNote ||
                    "Purchase Payment",
                },
              }
            );
          }

          /* ==================================================
             SUPPLIER TRANSACTION
          ================================================== */

          if (total > 0) {
            await tx.suppliertransaction.create(
              {
                data: {
                  supplierId,

                  purchaseId:
                    purchase.id,

                  description:
                    `Purchase ${purchaseNo}`,

                  debit: total,

                  credit: 0,
                },
              }
            );
          }

          if (paidAmount > 0) {
            await tx.suppliertransaction.create(
              {
                data: {
                  supplierId,

                  purchaseId:
                    purchase.id,

                  description:
                    `Payment for ${purchaseNo}`,

                  debit: 0,

                  credit:
                    paidAmount,
                },
              }
            );
          }

          return {
            purchaseId:
              purchase.id,

            purchaseNo,

            supplierId,

            subtotal,

            tax,

            discount:
              finalDiscount,

            total,

            paidAmount,

            balanceAmount,

            status,

            paymentMethod:
              paymentMethod?.name ??
              null,

            itemCount:
              purchaseItems.length,
          };
        }
      );

    return NextResponse.json(
      {
        success: true,
        message:
          "Purchase created successfully.",
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE PURCHASE ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "SUPPLIER_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supplier not found or inactive.",
        },
        { status: 400 }
      );
    }

    if (
      message.startsWith(
        "PRODUCT_NOT_FOUND:"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "One or more products were not found.",
        },
        { status: 400 }
      );
    }

    if (
      message.startsWith(
        "PRODUCT_INACTIVE:"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "One or more selected products are inactive.",
        },
        { status: 400 }
      );
    }

    if (
      message.startsWith(
        "ITEM_DISCOUNT_EXCEEDED:"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Item discount cannot exceed the item amount.",
        },
        { status: 400 }
      );
    }

    if (
      message ===
      "PAID_AMOUNT_EXCEEDED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Paid amount cannot exceed purchase total.",
        },
        { status: 400 }
      );
    }

    if (
      message ===
      "PAYMENT_METHOD_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected payment method is not active.",
        },
        { status: 400 }
      );
    }

    if (
      message ===
      "PURCHASE_NUMBER_GENERATION_FAILED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to generate purchase number.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create purchase.",
      },
      { status: 500 }
    );
  }
}