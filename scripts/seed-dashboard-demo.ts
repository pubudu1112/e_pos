
import { prisma } from "../lib/prisma";

function money(value: number) {
  return Math.round(value * 100) / 100;
}

async function main() {
  const [products, users, paymentMethods, customer] =
    await Promise.all([
      prisma.product.findMany({
        where: {
          status: "ACTIVE",
          sellingPrice: { gt: 0 },
        },
        select: {
          id: true,
          name: true,
          sellingPrice: true,
          purchasePrice: true,
        },
        orderBy: { id: "asc" },
      }),
      prisma.user.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
        take: 1,
      }),
      prisma.paymentmethod.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { id: "asc" },
      }),
      prisma.customer.findFirst({
        where: { isActive: true },
        select: { id: true },
      }),
    ]);

  if (!products.length) {
    throw new Error("No active products with a selling price were found.");
  }

  if (!users.length) {
    throw new Error("No active users were found.");
  }

  if (!paymentMethods.length) {
    throw new Error("No active payment methods were found.");
  }

  let created = 0;
  let skipped = 0;

  // Four demo sales per day for the last seven days.
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);

    for (let order = 0; order < 4; order++) {
      const saleDate = new Date(date);
      saleDate.setHours(9 + order * 2, 15, 0, 0);

      const dateKey = [
        saleDate.getFullYear(),
        String(saleDate.getMonth() + 1).padStart(2, "0"),
        String(saleDate.getDate()).padStart(2, "0"),
      ].join("");

      const invoiceNo = `DEMO-DASH-${dateKey}-${order + 1}`;

      // Prevent duplicate demo invoices on reruns.
      const existing = await prisma.sale.findUnique({
        where: { invoiceNo },
        select: { id: true },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const product =
        products[(dayOffset * 4 + order) % products.length];

      const paymentMethod =
        paymentMethods[(dayOffset + order) % paymentMethods.length];

      const quantity = 1 + ((dayOffset + order) % 3);
      const unitPrice = Number(product.sellingPrice);
      const costPrice = Number(product.purchasePrice);
      const total = money(unitPrice * quantity);

      await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.create({
          data: {
            invoiceNo,
            customerId: customer?.id ?? null,
            createdById: users[0].id,
            saleDate,
            subtotal: total,
            discount: 0,
            tax: 0,
            total,
            paidAmount: total,
            balanceAmount: 0,
            status: "COMPLETED",
            paymentStatus: "PAID",
            createdAt: saleDate,
            updatedAt: saleDate,
          },
        });

        await tx.saleitem.create({
          data: {
            saleId: sale.id,
            productId: product.id,
            description: product.name,
            quantity,
            unitPrice,
            costPrice,
            discount: 0,
            tax: 0,
            total,
          },
        });

        await tx.payment.create({
          data: {
            saleId: sale.id,
            paymentMethodId: paymentMethod.id,
            amount: total,
            paymentDate: saleDate,
            reference: invoiceNo,
            note: "DEMO DASHBOARD DATA - TEST ONLY",
          },
        });
      });

      created++;
    }
  }

  console.log("Dashboard demo data completed.");
  console.log(`Created: ${created}`);
  console.log(`Already existed/skipped: ${skipped}`);
  console.log("Stock quantities were not changed.");
}

main()
  .catch((error) => {
    console.error("Failed to seed dashboard demo data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
