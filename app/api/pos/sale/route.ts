import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { getStoredSettings } from "@/lib/settings";

type SaleItemInput = {
  id: number;
  type: "PRODUCT" | "SERVICE";
  quantity: number;
  unitPrice?: number;
  warrantyMonths?: number | null;
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
    // Authentication & User resolution
    // ========================================================

    const { getSession } =
      await import("@/lib/auth/session");

    const session =
      await getSession();

    let createdById: number;

    if (session) {
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

      createdById = session.user.id;
    } else {
      // In store terminal or direct POS access, fallback to active admin user
      const activeUser = await prisma.user.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { id: "asc" },
      });

      if (!activeUser) {
        return NextResponse.json(
          {
            success: false,
            message:
              "No active cashier or admin user found to record the sale.",
          },
          { status: 401 }
        );
      }

      createdById = activeUser.id;
    }

    // ========================================================
    // Settings & Price Editing Permission Check
    // ========================================================
    const generalSettings = await getStoredSettings();
    const allowPriceEditMode = generalSettings.posAllowPriceEdit || "ADMIN_MANAGER";
    const userRoleName = (session?.user?.role?.name || "").toUpperCase();
    const isSuperAdmin = userRoleName.includes("SUPER_ADMIN") || userRoleName.includes("SUPER ADMIN") || userRoleName.includes("OWNER");
    const isManager = isSuperAdmin || userRoleName.includes("ADMIN") || userRoleName.includes("MANAGER");

    let isPriceEditAllowed = false;
    if (allowPriceEditMode === "ALL") {
      isPriceEditAllowed = true;
    } else if (allowPriceEditMode === "ADMIN_MANAGER") {
      isPriceEditAllowed = isManager;
    } else if (allowPriceEditMode === "SUPER_ADMIN") {
      isPriceEditAllowed = isSuperAdmin;
    }

    // ========================================================
    // Read Request
    // ========================================================

    let body: Record<string, unknown>;

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

    const paymentReference =
      typeof body.paymentReference === "string"
        ? body.paymentReference.trim()
        : typeof body.reference === "string"
          ? body.reference.trim()
          : "";

    const paymentNote =
      typeof body.paymentNote === "string"
        ? body.paymentNote.trim()
        : typeof body.note === "string"
          ? body.note.trim()
          : "";

    const cashTendered =
      Number(body.cashTendered) || 0;

    const changeAmount =
      Number(body.changeAmount) || 0;

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
            warrantyMonths?: number | null;
          }> = [];
          const createdWarranties: Array<{
            warrantyCode: string;
            productName: string;
            durationMonths: number;
            expiryDate: string;
          }> = [];
          const serviceMaterialConsumptions: Array<{
            productId: number;
            productName: string;
            quantity: number;
            serviceName: string;
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
                      category: {
                        select: {
                          id: true,
                          warrantyEnabled: true,
                        },
                      },
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

              const catalogPrice = Number(product.sellingPrice);
              const hasCustomPrice =
                typeof item.unitPrice === "number" &&
                Number.isFinite(item.unitPrice) &&
                item.unitPrice >= 0;

              const unitPrice =
                isPriceEditAllowed && hasCustomPrice
                  ? Number(item.unitPrice)
                  : catalogPrice;

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

              const chosenWarranty = product.category.warrantyEnabled
                ? (
                  item.warrantyMonths !== undefined &&
                    item.warrantyMonths !== null
                    ? Number(item.warrantyMonths)
                    : Number(product.warrantyMonths || 0)
                )
                : 0;

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

                warrantyMonths:
                  chosenWarranty > 0 ? chosenWarranty : null,
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
              const service = await tx.service.findUnique({
                where: {
                  id: item.id,
                },
                include: {
                  tax: true,
                  costComponents: {
                    include: {
                      product: {
                        select: {
                          id: true,
                          name: true,
                          status: true,
                        },
                      },
                    },
                  },
                },
              });

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

              const catalogPrice = Number(service.basePrice);
              const hasCustomPrice =
                typeof item.unitPrice === "number" &&
                Number.isFinite(item.unitPrice) &&
                item.unitPrice >= 0;

              const unitPrice =
                isPriceEditAllowed && hasCustomPrice
                  ? Number(item.unitPrice)
                  : catalogPrice;

              // Calculate service cost from relational ServiceCostComponent records.
              // INVENTORY components affect both cost and stock; MANUAL affects cost only.
              let serviceCost =
                Number(service.paperCost || 0) +
                Number(service.tonerCost || 0) +
                Number(service.machineCost || 0);

              for (const comp of service.costComponents) {
                const unitCost = Number(comp.unitCost || 0);
                const componentQty = Number(comp.quantity || 0);

                if (!Number.isFinite(unitCost) || unitCost < 0) {
                  throw new Error(`INVALID_SERVICE_COMPONENT:${comp.name}`);
                }

                if (comp.costType === "INVENTORY") {
                  if (!comp.productId || !comp.product || comp.product.status !== "ACTIVE") {
                    throw new Error(`INVALID_SERVICE_COMPONENT:${comp.name}`);
                  }
                  if (!Number.isFinite(componentQty) || componentQty <= 0) {
                    throw new Error(`INVALID_SERVICE_COMPONENT:${comp.name}`);
                  }

                  serviceCost += unitCost * componentQty;
                  serviceMaterialConsumptions.push({
                    productId: comp.productId,
                    productName: comp.product.name,
                    quantity: item.quantity * componentQty,
                    serviceName: service.name,
                  });
                } else if (comp.costType === "MANUAL") {
                  if (!Number.isFinite(componentQty) || componentQty < 0) {
                    throw new Error(`INVALID_SERVICE_COMPONENT:${comp.name}`);
                  }

                  serviceCost += unitCost * componentQty;
                }
              }

              if (!Number.isFinite(serviceCost) || serviceCost < 0) {
                throw new Error(`INVALID_SERVICE_COST:${service.name}`);
              }

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

                // Track production cost (Paper + Toner + Machine) for net profit calculation
                costPrice:
                  serviceCost > 0
                    ? serviceCost
                    : null,

                discount: 0,

                tax: lineTax,

                total: lineTotal,

                warrantyMonths: null,
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
            // WARRANTY CREATION (FOR PHONE ACCESSORIES & WARRANTY PRODUCTS)
            // ==============================================
            if (
              saleItem.productId &&
              saleItem.warrantyMonths &&
              saleItem.warrantyMonths > 0
            ) {
              const now = new Date();
              const year = now.getFullYear();
              const month = String(now.getMonth() + 1).padStart(2, "0");
              const randCode = Math.floor(10000 + Math.random() * 90000);
              const warrantyCode = `WAR-${year}${month}-${randCode}`;

              const expiryDate = new Date(now.getTime());
              expiryDate.setMonth(expiryDate.getMonth() + Number(saleItem.warrantyMonths));

              let customerRecord = null;
              if (customerId) {
                customerRecord = await tx.customer.findUnique({
                  where: { id: customerId },
                  select: { name: true, phone: true },
                });
              }

              await tx.warranty.create({
                data: {
                  warrantyCode,
                  saleId: sale.id,
                  productId: saleItem.productId,
                  customerId: customerId || null,
                  customerName: customerRecord?.name || "Walk-in Customer",
                  customerPhone: customerRecord?.phone || null,
                  startDate: now,
                  durationMonths: Number(saleItem.warrantyMonths),
                  expiryDate,
                  status: "ACTIVE",
                  notes: `Warranty issued on POS sale ${invoiceNo} for ${saleItem.description}`,
                },
              });

              createdWarranties.push({
                warrantyCode,
                productName: saleItem.description,
                durationMonths: Number(saleItem.warrantyMonths),
                expiryDate: expiryDate.toLocaleDateString("en-LK", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }),
              });
            }

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
          // SERVICE MATERIAL CONSUMPTIONS (STOCK DEDUCTION)
          // ==================================================

          // Aggregate repeated material usage so each stock item is deducted once.
          const aggregatedConsumptions = new Map<
            number,
            { productName: string; quantity: number; serviceNames: Set<string> }
          >();

          for (const mat of serviceMaterialConsumptions) {
            const existing = aggregatedConsumptions.get(mat.productId);
            if (existing) {
              existing.quantity += mat.quantity;
              existing.serviceNames.add(mat.serviceName);
            } else {
              aggregatedConsumptions.set(mat.productId, {
                productName: mat.productName,
                quantity: mat.quantity,
                serviceNames: new Set([mat.serviceName]),
              });
            }
          }

          for (const [productId, mat] of aggregatedConsumptions) {
            const requiredQuantity = mat.quantity;
            const stockUpdate = await tx.stock.updateMany({
              where: {
                productId,
                quantity: { gte: requiredQuantity },
              },
              data: {
                quantity: { decrement: requiredQuantity },
                updatedAt: new Date(),
              },
            });

            if (stockUpdate.count !== 1) {
              const latestStock = await tx.stock.findUnique({
                where: { productId },
                select: { quantity: true },
              });
              const available = latestStock ? Number(latestStock.quantity) : 0;
              throw new Error(`INSUFFICIENT_STOCK:${mat.productName}:${available}`);
            }

            lowStockProductIds.add(productId);
            await tx.stockmovement.create({
              data: {
                productId,
                type: "SALE",
                quantity: requiredQuantity,
                referenceId: invoiceNo,
                note: `Service material: ${[...mat.serviceNames].join(", ")} (${mat.productName} x${requiredQuantity})`,
              },
            });
          }

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

          const generatedNote =
            paymentNote ||
            (cashTendered > 0
              ? `Tendered: Rs. ${cashTendered.toFixed(2)}, Change: Rs. ${changeAmount.toFixed(2)}`
              : "POS Payment");

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
                paymentReference || invoiceNo,

              note:
                generatedNote,
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

            cashTendered:
              cashTendered > 0 ? roundMoney(cashTendered) : roundMoney(paidAmount),

            changeAmount:
              changeAmount > 0 ? roundMoney(changeAmount) : 0,

            paymentReference:
              paymentReference || invoiceNo,

            paymentMethod:
              paymentMethod.name,

            itemCount:
              saleItems.length,

            warranties: createdWarranties,
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