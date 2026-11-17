import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

const ALLOWED_PAYMENT_METHODS = [
  "CASH",
  "CARD",
  "BANK_TRANSFER",
  "ONLINE",
  "OTHER",
] as const;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const allowed =
      (await hasPermission("CUSTOMER_UPDATE")) ||
      (await hasPermission("POS_CREATE_SALE")) ||
      session.user.role.name === "SUPER_ADMIN" ||
      session.user.role.name === "ADMIN";

    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to record customer payments." },
        { status: 403 }
      );
    }

    const { id: rawId } = await params;
    const customerId = Number(rawId);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid customer ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const amount = roundMoney(Number(body.amount));
    const paymentMethodType = String(body.paymentMethod || body.paymentMethodType || "CASH").toUpperCase();
    const reference = typeof body.reference === "string" ? body.reference.trim() : null;
    const note = typeof body.note === "string" ? body.note.trim() : "Customer due payment";
    const specificSaleId = body.saleId ? Number(body.saleId) : null;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Payment amount must be greater than zero." },
        { status: 400 }
      );
    }

    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethodType as any)) {
      return NextResponse.json(
        { success: false, message: "Please select a valid payment method (Cash, Card, Bank Transfer, or Online QR)." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found." },
        { status: 404 }
      );
    }

    const paymentMethod = await prisma.paymentmethod.findFirst({
      where: {
        type: paymentMethodType as any,
        isActive: true,
      },
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, message: "Payment method not available in system." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let remainingAmount = amount;
      const settledSales: Array<{ invoiceNo: string; paid: number; newBalance: number }> = [];

      // 1. If paying for a specific sale
      if (specificSaleId) {
        const sale = await tx.sale.findUnique({
          where: { id: specificSaleId },
        });

        if (!sale || sale.customerId !== customerId) {
          throw new Error("SALE_NOT_FOUND");
        }

        const currentBalance = Number(sale.balanceAmount);
        if (currentBalance <= 0) {
          throw new Error("SALE_ALREADY_PAID");
        }

        const payTowardsSale = Math.min(remainingAmount, currentBalance);
        const newPaidAmount = roundMoney(Number(sale.paidAmount) + payTowardsSale);
        const newBalanceAmount = roundMoney(Math.max(0, currentBalance - payTowardsSale));
        const newStatus = newBalanceAmount <= 0 ? "PAID" : "PARTIAL";

        await tx.sale.update({
          where: { id: sale.id },
          data: {
            paidAmount: newPaidAmount,
            balanceAmount: newBalanceAmount,
            paymentStatus: newStatus,
            updatedAt: new Date(),
          },
        });

        await tx.payment.create({
          data: {
            saleId: sale.id,
            paymentMethodId: paymentMethod.id,
            amount: payTowardsSale,
            paymentDate: new Date(),
            reference: reference || `PAY-${sale.invoiceNo}`,
            note: note || `Due payment for invoice ${sale.invoiceNo}`,
          },
        });

        await tx.customertransaction.create({
          data: {
            customerId,
            saleId: sale.id,
            description: `Payment received for ${sale.invoiceNo}${reference ? ` (Ref: ${reference})` : ""}`,
            debit: 0,
            credit: payTowardsSale,
          },
        });

        settledSales.push({
          invoiceNo: sale.invoiceNo,
          paid: payTowardsSale,
          newBalance: newBalanceAmount,
        });

        remainingAmount = roundMoney(remainingAmount - payTowardsSale);
      } else {
        // 2. FIFO Settlement across all pending sales with balance
        const pendingSales = await tx.sale.findMany({
          where: {
            customerId,
            status: "COMPLETED",
            balanceAmount: { gt: 0 },
          },
          orderBy: { saleDate: "asc" },
        });

        for (const sale of pendingSales) {
          if (remainingAmount <= 0) break;

          const saleBalance = Number(sale.balanceAmount);
          const payTowardsSale = roundMoney(Math.min(remainingAmount, saleBalance));
          const newPaidAmount = roundMoney(Number(sale.paidAmount) + payTowardsSale);
          const newBalanceAmount = roundMoney(Math.max(0, saleBalance - payTowardsSale));
          const newStatus = newBalanceAmount <= 0 ? "PAID" : "PARTIAL";

          await tx.sale.update({
            where: { id: sale.id },
            data: {
              paidAmount: newPaidAmount,
              balanceAmount: newBalanceAmount,
              paymentStatus: newStatus,
              updatedAt: new Date(),
            },
          });

          await tx.payment.create({
            data: {
              saleId: sale.id,
              paymentMethodId: paymentMethod.id,
              amount: payTowardsSale,
              paymentDate: new Date(),
              reference: reference || `PAY-${sale.invoiceNo}`,
              note: note || `Settlement payment for ${sale.invoiceNo}`,
            },
          });

          await tx.customertransaction.create({
            data: {
              customerId,
              saleId: sale.id,
              description: `Payment applied to ${sale.invoiceNo}${reference ? ` (Ref: ${reference})` : ""}`,
              debit: 0,
              credit: payTowardsSale,
            },
          });

          settledSales.push({
            invoiceNo: sale.invoiceNo,
            paid: payTowardsSale,
            newBalance: newBalanceAmount,
          });

          remainingAmount = roundMoney(remainingAmount - payTowardsSale);
        }

        // If there's still leftover amount (e.g. paying opening balance or advance credit)
        if (remainingAmount > 0) {
          await tx.customertransaction.create({
            data: {
              customerId,
              description: `General account credit payment${reference ? ` (Ref: ${reference})` : ""}`,
              debit: 0,
              credit: remainingAmount,
            },
          });
        }
      }

      // Record audit log
      try {
        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            action: "CUSTOMER_PAYMENT",
            entity: "Customer",
            entityId: String(customerId),
            details: JSON.stringify({
              customerName: customer.name,
              amount,
              paymentMethod: paymentMethod.name,
              settledSales,
            }),
          },
        });
      } catch {}

      return {
        amount,
        settledSales,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Payment of Rs. ${amount.toFixed(2)} recorded successfully.`,
      data: result,
    });
  } catch (error) {
    console.error("RECORD CUSTOMER PAYMENT ERROR:", error);

    if (error instanceof Error) {
      if (error.message === "SALE_NOT_FOUND") {
        return NextResponse.json(
          { success: false, message: "Sale invoice not found for this customer." },
          { status: 404 }
        );
      }
      if (error.message === "SALE_ALREADY_PAID") {
        return NextResponse.json(
          { success: false, message: "This sale invoice is already fully paid." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, message: "Failed to record customer payment." },
      { status: 500 }
    );
  }
}
