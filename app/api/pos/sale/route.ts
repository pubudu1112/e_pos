import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

type SaleItemInput = {
  id: number;
  type: "PRODUCT" | "SERVICE";
  quantity: number;
  unitPrice?: number;
};

function generateInvoiceNo() {
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

  return `INV-${year}${month}${day}-${random}`;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

// ============================================================
// POST - Complete POS Sale
// ============================================================

export async function POST(
  request: Request
) {
  try {
    // ========================================================
    // Authentication
    // ========================================================

    const { getSession } =
      await import("@/lib/auth/session");

    const session =
      await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be logged in to complete a sale.",
        },
        { status: 401 }
      );
    }

    // ========================================================
    // POS CREATE SALE PERMISSION
    // ========================================================

    const canCreateSale =
      await hasPermission(
        "POS_CREATE_SALE"
      );

    if (!canCreateSale) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to create sales.",
        },
        { status: 403 }
      );
    }

    const createdById =
      session.user.id;

    // ========================================================
    // Read Request
    // ========================================================

    let body: any;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid request data.",
        },
        { status: 400 }
      );
    }

    const paymentMethodType =
      typeof body.paymentMethod ===
      "string"
        ? body.paymentMethod.trim()
        : "";

    const items =
      Array.isArray(body.items)
        ? (body.items as SaleItemInput[])
        : [];

    const customerId =
      body.customerId !== null &&
      body.customerId !== undefined &&
      body.customerId !== ""
        ? Number(body.customerId)
        : null;

    const discount =
      Number(body.discount) || 0;

    // ========================================================
    // Validate Cart
    // ========================================================

    if (items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cart is empty.",
        },
        { status: 400 }
      );
    }

    if (items.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many items in one sale.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // Validate Discount
    // ========================================================

    if (
      !Number.isFinite(discount) ||
      discount < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid discount.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // Allowed Payment Methods
    // ========================================================

    const allowedPaymentMethods = [
      "CASH",
      "CARD",
      "BANK_TRANSFER",
      "ONLINE",
      "CREDIT",
      "OTHER",
    ] as const;

    if (
      !allowedPaymentMethods.includes(
        paymentMethodType as
          | "CASH"
          | "CARD"
          | "BANK_TRANSFER"
          | "ONLINE"
          | "CREDIT"
          | "OTHER"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment method.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // Validate Customer
    // ========================================================

    if (customerId !== null) {
      if (
        !Number.isInteger(customerId) ||
        customerId <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid customer.",
          },
          { status: 400 }
        );
      }

      const customer =
        await prisma.customer.findUnique(
          {
            where: {
              id: customerId,
            },
            select: {
              id: true,
            },
          }
        );

      if (!customer) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Customer not found.",
          },
          { status: 404 }
        );
      }
    }

    // ========================================================
    // Validate Items
    // ========================================================

    for (const item of items) {
      if (
        !Number.isInteger(item.id) ||
        item.id <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One of the selected items is invalid.",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isFinite(
          item.quantity
        ) ||
        item.quantity <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Item quantity must be greater than 0.",
          },
          { status: 400 }
        );
      }

      if (
        item.quantity >
        999999999
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Item quantity is too large.",
          },
          { status: 400 }
        );
      }

      if (
        item.type !== "PRODUCT" &&
        item.type !== "SERVICE"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid item type.",
          },
          { status: 400 }
        );
      }
    }

    // ========================================================
    // Transaction
    // ========================================================

    const result =
      await prisma.$transaction(
        async (tx) => {
          let subtotal = 0;
          let taxTotal = 0;

          const saleItems: Array<{
            productId: number | null;
            serviceId: number | null;
            description: string;
            quantity: number;
            unitPrice: number;
            costPrice: number | null;
            discount: number;
            tax: number;
            total: number;
          }> = [];

          // ==================================================
          // LOW STOCK PRODUCT TRACKING
          // ==================================================

          const lowStockProductIds =
            new Set<number>();

          // ==================================================
          // Process Cart Items
          // ==================================================

          for (const item of items) {
            // ================================================
            // PRODUCT
            // ================================================

            if (
              item.type ===
              "PRODUCT"
            ) {
              const product =
                await tx.product.findUnique(
                  {
                    where: {
                      id: item.id,
                    },
                    include: {
                      tax: true,
                      stock: true,
                    },
                  }
                );

              if (!product) {
                throw new Error(
                  `PRODUCT_NOT_FOUND:${item.id}`
                );
              }

              if (
                product.status !==
                "ACTIVE"
              ) {
                throw new Error(
                  `PRODUCT_INACTIVE:${product.name}`
                );
              }

              const currentStock =
                product.stock
                  ? Number(
                      product.stock
                        .quantity
                    )
                  : 0;

              // ----------------------------------------------
              // Initial stock validation
              // ----------------------------------------------

              if (
                item.quantity >
                currentStock
              ) {
                throw new Error(
                  `INSUFFICIENT_STOCK:${product.name}:${currentStock}`
                );
              }

              // ----------------------------------------------
              // Server-side selling price
              // ----------------------------------------------

              const unitPrice =
                Number(
                  product.sellingPrice
                );

              // ----------------------------------------------
              // Cost price snapshot
              // ----------------------------------------------

              const costPrice =
                Number(
                  product.purchasePrice
                );

              const lineSubtotal =
                unitPrice *
                item.quantity;

              const taxRate =
                product.tax
                  ? Number(
                      product.tax.rate
                    )
                  : 0;

              const lineTax =
                lineSubtotal *
                (taxRate / 100);

              const lineTotal =
                lineSubtotal +
                lineTax;

              subtotal +=
                lineSubtotal;

              taxTotal +=
                lineTax;

              saleItems.push({
                productId:
                  product.id,

                serviceId:
                  null,

                description:
                  product.name,

                quantity:
                  item.quantity,

                unitPrice,

                costPrice,

                discount: 0,

                tax: lineTax,

                total: lineTotal,
              });

              continue;
            }

            // ================================================
            // SERVICE
            // ================================================

            if (
              item.type ===
              "SERVICE"
            ) {
              const service =
                await tx.service.findUnique(
                  {
                    where: {
                      id: item.id,
                    },
                    include: {
                      tax: true,
                    },
                  }
                );

              if (!service) {
                throw new Error(
                  `SERVICE_NOT_FOUND:${item.id}`
                );
              }

              if (
                service.status !==
                "ACTIVE"
              ) {
                throw new Error(
                  `SERVICE_INACTIVE:${service.name}`
                );
              }

              const unitPrice =
                Number(
                  service.basePrice
                );

              const lineSubtotal =
                unitPrice *
                item.quantity;

              const taxRate =
                service.tax
                  ? Number(
                      service.tax.rate
                    )
                  : 0;

              const lineTax =
                lineSubtotal *
                (taxRate / 100);

              const lineTotal =
                lineSubtotal +
                lineTax;

              subtotal +=
                lineSubtotal;

              taxTotal +=
                lineTax;

              saleItems.push({
                productId:
                  null,

                serviceId:
                  service.id,

                description:
                  service.name,

                quantity:
                  item.quantity,

                unitPrice,

                // Services currently don't
                // have cost tracking.
                costPrice:
                  null,

                discount: 0,

                tax: lineTax,

                total: lineTotal,
              });
            }
          }

          // ==================================================
          // Final Totals
          // ==================================================

          const totalBeforeDiscount =
            subtotal +
            taxTotal;

          const finalDiscount =
            Math.min(
              discount,
              totalBeforeDiscount
            );

          const total =
            Math.max(
              totalBeforeDiscount -
                finalDiscount,
              0
            );

          // --------------------------------------------------
          // Current POS = full payment
          // --------------------------------------------------

          const paidAmount =
            total;

          const balanceAmount =
            0;

          // ==================================================
          // Generate Unique Invoice Number
          // ==================================================

          let invoiceNo =
            generateInvoiceNo();

          let existingSale =
            await tx.sale.findUnique(
              {
                where: {
                  invoiceNo,
                },
              }
            );

          let attempts = 0;

          while (
            existingSale &&
            attempts < 10
          ) {
            invoiceNo =
              generateInvoiceNo();

            existingSale =
              await tx.sale.findUnique(
                {
                  where: {
                    invoiceNo,
                  },
                }
              );

            attempts++;
          }

          if (existingSale) {
            throw new Error(
              "INVOICE_GENERATION_FAILED"
            );
          }

          // ==================================================
          // Payment Method
          // ==================================================

          const paymentMethod =
            await tx.paymentmethod.findFirst(
              {
                where: {
                  type:
                    paymentMethodType as
                      | "CASH"
                      | "CARD"
                      | "BANK_TRANSFER"
                      | "ONLINE"
                      | "CREDIT"
                      | "OTHER",

                  isActive: true,
                },
              }
            );

          if (!paymentMethod) {
            throw new Error(
              `PAYMENT_METHOD_NOT_FOUND:${paymentMethodType}`
            );
          }

          // ==================================================
          // Create Sale
          // ==================================================

          const sale =
            await tx.sale.create({
              data: {
                invoiceNo,

                customerId,

                createdById,

                subtotal:
                  roundMoney(
                    subtotal
                  ),

                discount:
                  roundMoney(
                    finalDiscount
                  ),

                tax:
                  roundMoney(
                    taxTotal
                  ),

                total:
                  roundMoney(
                    total
                  ),

                paidAmount:
                  roundMoney(
                    paidAmount
                  ),

                balanceAmount:
                  roundMoney(
                    balanceAmount
                  ),

                status:
                  "COMPLETED",

                paymentStatus:
                  "PAID",

                updatedAt:
                  new Date(),
              },
            });

          // ==================================================
          // Create Sale Items
          // ==================================================

          for (
            const saleItem of saleItems
          ) {
            await tx.saleitem.create({
              data: {
                saleId:
                  sale.id,

                productId:
                  saleItem.productId,

                serviceId:
                  saleItem.serviceId,

                description:
                  saleItem.description,

                quantity:
                  saleItem.quantity,

                unitPrice:
                  saleItem.unitPrice,

                costPrice:
                  saleItem.costPrice,

                discount:
                  saleItem.discount,

                tax:
                  roundMoney(
                    saleItem.tax
                  ),

                total:
                  roundMoney(
                    saleItem.total
                  ),
              },
            });

            // ==============================================
            // PRODUCT STOCK
            // ==============================================

            if (
              saleItem.productId !==
              null
            ) {
              // --------------------------------------------
              // Atomic stock deduction
              //
              // quantity must still be >= requested quantity
              // at the exact time of UPDATE.
              // --------------------------------------------

              const stockUpdate =
                await tx.stock.updateMany(
                  {
                    where: {
                      productId:
                        saleItem.productId,

                      quantity: {
                        gte:
                          saleItem.quantity,
                      },
                    },

                    data: {
                      quantity: {
                        decrement:
                          saleItem.quantity,
                      },

                      updatedAt:
                        new Date(),
                    },
                  }
                );

              if (
                stockUpdate.count !==
                1
              ) {
                const latestStock =
                  await tx.stock.findUnique(
                    {
                      where: {
                        productId:
                          saleItem.productId,
                      },
                      select: {
                        quantity:
                          true,
                      },
                    }
                  );

                const currentStock =
                  latestStock
                    ? Number(
                        latestStock.quantity
                      )
                    : 0;

                throw new Error(
                  `INSUFFICIENT_STOCK:${saleItem.description}:${currentStock}`
                );
              }

              // ==========================================
              // ADD PRODUCT TO LOW STOCK CHECK
              // ==========================================

              lowStockProductIds.add(
                saleItem.productId
              );

              // ==========================================
              // Stock Movement
              // ==========================================

              await tx.stockmovement.create({
                data: {
                  productId:
                    saleItem.productId,

                  type:
                    "SALE",

                  quantity:
                    saleItem.quantity,

                  referenceId:
                    invoiceNo,

                  note:
                    `POS Sale ${invoiceNo}`,
                },
              });
            }
          }

          // ==================================================
          // LOW STOCK NOTIFICATIONS
          // ==================================================

          if (
            lowStockProductIds.size >
            0
          ) {
            const lowStockProducts =
              await tx.product.findMany(
                {
                  where: {
                    id: {
                      in: Array.from(
                        lowStockProductIds
                      ),
                    },

                    status:
                      "ACTIVE",
                  },

                  select: {
                    id: true,

                    name: true,

                    minimumStock:
                      true,

                    stock: {
                      select: {
                        quantity:
                          true,
                      },
                    },
                  },
                }
              );

            // ------------------------------------------------
            // Get Active SUPER_ADMIN + MANAGER users
            // ------------------------------------------------

            const notificationUsers =
              await tx.user.findMany(
                {
                  where: {
                    status:
                      "ACTIVE",

                    role: {
                      name: {
                        in: [
                          "SUPER_ADMIN",
                          "MANAGER",
                        ],
                      },
                    },
                  },

                  select: {
                    id: true,
                  },
                }
              );

            if (
              notificationUsers.length >
              0
            ) {
              const notifications: Array<{
                userId: number;
                type: string;
                title: string;
                message: string;
                referenceId: string;
                isRead: boolean;
              }> = [];

              // ----------------------------------------------
              // Check each product
              // ----------------------------------------------

              for (
                const product of lowStockProducts
              ) {
                const currentStock =
                  product.stock
                    ? Number(
                        product.stock
                          .quantity
                      )
                    : 0;

                const minimumStock =
                  Number(
                    product.minimumStock ??
                      0
                  );

                // --------------------------------------------
                // Low stock condition
                // --------------------------------------------

                if (
                  currentStock <=
                  minimumStock
                ) {
                  for (
                    const user of notificationUsers
                  ) {
                    notifications.push(
                      {
                        userId:
                          user.id,

                        type:
                          "LOW_STOCK",

                        title:
                          "Low Stock Alert",

                        message:
                          `${product.name} stock is now ${currentStock}. Minimum stock is ${minimumStock}.`,

                        referenceId:
                          String(
                            product.id
                          ),

                        isRead:
                          false,
                      }
                    );
                  }
                }
              }

              // ----------------------------------------------
              // Save notifications
              // ----------------------------------------------

              if (
                notifications.length >
                0
              ) {
                await tx.notification.createMany(
                  {
                    data:
                      notifications,
                  }
                );
              }
            }
          }

          // ==================================================
          // Create Payment
          // ==================================================

          await tx.payment.create({
            data: {
              saleId:
                sale.id,

              paymentMethodId:
                paymentMethod.id,

              amount:
                roundMoney(
                  paidAmount
                ),

              reference:
                invoiceNo,

              note:
                "POS Payment",
            },
          });

          // ==================================================
          // Customer Transaction
          // ==================================================

          if (
            customerId !== null
          ) {
            await tx.customertransaction.create(
              {
                data: {
                  customerId,

                  saleId:
                    sale.id,

                  description:
                    `POS Sale ${invoiceNo}`,

                  debit:
                    roundMoney(
                      total
                    ),

                  credit: 0,
                },
              }
            );
          }

          // ==================================================
          // Return Safe Data
          // ==================================================

          return {
            saleId:
              sale.id,

            invoiceNo,

            subtotal:
              roundMoney(
                subtotal
              ),

            tax:
              roundMoney(
                taxTotal
              ),

            discount:
              roundMoney(
                finalDiscount
              ),

            total:
              roundMoney(
                total
              ),

            paidAmount:
              roundMoney(
                paidAmount
              ),

            balanceAmount:
              roundMoney(
                balanceAmount
              ),

            paymentMethod:
              paymentMethod.name,

            itemCount:
              saleItems.length,
          };
        }
      );

    // ========================================================
    // Success
    // ========================================================

    return NextResponse.json(
      {
        success: true,

        message:
          "Sale completed successfully.",

        data: result,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE POS SALE ERROR:",
      error
    );

    if (error instanceof Error) {
      // ======================================================
      // Product
      // ======================================================

      if (
        error.message.startsWith(
          "PRODUCT_NOT_FOUND:"
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Product not found.",
          },
          {
            status: 404,
          }
        );
      }

      if (
        error.message.startsWith(
          "PRODUCT_INACTIVE:"
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One of the selected products is inactive.",
          },
          {
            status: 400,
          }
        );
      }

      // ======================================================
      // Service
      // ======================================================

      if (
        error.message.startsWith(
          "SERVICE_NOT_FOUND:"
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Service not found.",
          },
          {
            status: 404,
          }
        );
      }

      if (
        error.message.startsWith(
          "SERVICE_INACTIVE:"
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One of the selected services is inactive.",
          },
          {
            status: 400,
          }
        );
      }

      // ======================================================
      // Stock
      // ======================================================

      if (
        error.message.startsWith(
          "INSUFFICIENT_STOCK:"
        )
      ) {
        const parts =
          error.message.split(":");

        const productName =
          parts[1] ??
          "Product";

        const currentStock =
          parts[2] ??
          "0";

        return NextResponse.json(
          {
            success: false,

            message:
              `Insufficient stock for ${productName}. Current stock is ${currentStock}.`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        error.message.startsWith(
          "STOCK_NOT_FOUND:"
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Stock record not found for a selected product.",
          },
          {
            status: 400,
          }
        );
      }

      // ======================================================
      // Payment
      // ======================================================

      if (
        error.message.startsWith(
          "PAYMENT_METHOD_NOT_FOUND:"
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected payment method is not available.",
          },
          {
            status: 400,
          }
        );
      }

      // ======================================================
      // Invoice
      // ======================================================

      if (
        error.message ===
        "INVOICE_GENERATION_FAILED"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Unable to generate a unique invoice number. Please try again.",
          },
          {
            status: 500,
          }
        );
      }

      // ======================================================
      // Prisma Unique Constraint
      // ======================================================

      const prismaError =
        error as {
          code?: string;
        };

      if (
        prismaError.code ===
        "P2002"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This sale could not be saved because a duplicate record was detected. Please try again.",
          },
          {
            status: 409,
          }
        );
      }
    }

    // ========================================================
    // General Error
    // ========================================================

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to complete sale.",
      },
      {
        status: 500,
      }
    );
  }
}