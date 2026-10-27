import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const allowed = await hasPermission("SUPPLIER_VIEW");

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to view supplier payments.",
        },
        { status: 403 }
      );
    }

    const payments = await prisma.purchasepayment.findMany({
      orderBy: {
        paymentDate: "desc",
      },
      include: {
        purchase: {
          select: {
            id: true,
            purchaseNo: true,
            supplier: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        paymentmethod: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    const data = payments.map((payment) => ({
      id: payment.id.toString(),

      supplierId: payment.purchase.supplier.id,
      supplierCode: payment.purchase.supplier.code,
      supplierName: payment.purchase.supplier.name,

      purchaseId: payment.purchase.id,
      purchaseNo: payment.purchase.purchaseNo,

      paymentMethodId: payment.paymentmethod.id,
      paymentMethod:
        payment.paymentmethod.name ||
        payment.paymentmethod.type,

      amount: Number(payment.amount),

      reference: payment.reference,
      note: payment.note,

      paymentDate: payment.paymentDate,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("GET SUPPLIER PAYMENTS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load supplier payments.",
      },
      { status: 500 }
    );
  }
}