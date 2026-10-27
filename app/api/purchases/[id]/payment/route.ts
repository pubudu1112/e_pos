
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const PAYMENT_METHODS = [
  "CASH",
  "CARD",
  "BANK_TRANSFER",
  "ONLINE",
  "CREDIT",
  "OTHER",
] as const;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    const allowed = await hasPermission("PURCHASE_UPDATE");

    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to record purchase payments." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const purchaseId = Number(id);

    if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid purchase ID." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const amount = roundMoney(Number(body.amount));
    const paymentMethodType = String(body.paymentMethodType ?? "");

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Payment amount must be greater than zero." },
        { status: 400 }
      );
    }

    if (
      !PAYMENT_METHODS.includes(
        paymentMethodType as (typeof PAYMENT_METHODS)[number]
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Select a valid payment method." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { supplier: true },
      });

      if (!purchase) {
        throw new Error("PURCHASE_NOT_FOUND");
      }

      const total = Number(purchase.total);
      const alreadyPaid = Number(purchase.paidAmount);
      const balance = roundMoney(total - alreadyPaid);

      if (balance <= 0) {
        throw new Error("PURCHASE_ALREADY_PAID");
      }

      if (amount > balance) {
        throw new Error("PAYMENT_EXCEEDS_BALANCE");
      }

      const paymentMethod = await tx.paymentmethod.findFirst({
        where: {
          type: paymentMethodType as
            | "CASH"
            | "CARD"
            | "BANK_TRANSFER"
            | "ONLINE"
            | "CREDIT"
            | "OTHER",
          isActive: true,
        },
        select: { id: true, name: true },
      });

      if (!paymentMethod) {
        throw new Error("PAYMENT_METHOD_NOT_FOUND");
      }

      const newPaidAmount = roundMoney(alreadyPaid + amount);
      const newBalance = roundMoney(total - newPaidAmount);
      const newStatus =
        newBalance === 0 ? "PAID" : "PARTIAL";

      const payment = await tx.purchasepayment.create({
        data: {
          purchaseId,
          paymentMethodId: paymentMethod.id,
          amount,
          paymentDate: new Date(),
          reference: body.reference
            ? String(body.reference).trim()
            : purchase.purchaseNo,
          note: body.note
            ? String(body.note).trim()
            : "Purchase Payment",
        },
      });

      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      await tx.suppliertransaction.create({
        data: {
          supplierId: purchase.supplierId,
          purchaseId,
          description: `Payment for ${purchase.purchaseNo}`,
          debit: 0,
          credit: amount,
        },
      });

      return {
        paymentId: payment.id,
        purchaseNo: purchase.purchaseNo,
        total,
        paidAmount: newPaidAmount,
        balanceAmount: newBalance,
        status: newStatus,
        paymentMethod: paymentMethod.name,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Purchase payment recorded successfully.",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "PURCHASE_NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Purchase not found." },
        { status: 404 }
      );
    }

    if (message === "PURCHASE_ALREADY_PAID") {
      return NextResponse.json(
        { success: false, message: "This purchase is already fully paid." },
        { status: 400 }
      );
    }

    if (message === "PAYMENT_EXCEEDS_BALANCE") {
      return NextResponse.json(
        { success: false, message: "Payment cannot exceed the outstanding balance." },
        { status: 400 }
      );
    }

    if (message === "PAYMENT_METHOD_NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Selected payment method is not active." },
        { status: 400 }
      );
    }

    console.error("PURCHASE PAYMENT ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Unable to record purchase payment." },
      { status: 500 }
    );
  }
}
