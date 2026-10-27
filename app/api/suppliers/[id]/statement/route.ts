import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!(await hasPermission("SUPPLIER_VIEW"))) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to view supplier data.",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const supplierId = Number(id);

    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid supplier ID.",
        },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.findUnique({
      where: {
        id: supplierId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        openingBalance: true,
        suppliertransaction: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            purchaseId: true,
            description: true,
            debit: true,
            credit: true,
            createdAt: true,
          },
        },
        purchase: {
          orderBy: {
            purchaseDate: "asc",
          },
          select: {
            id: true,
            purchaseNo: true,
            purchaseDate: true,
            total: true,
            paidAmount: true,
            balanceAmount: true,
            status: true,
            purchasepayment: {
              select: {
                id: true,
                amount: true,
                paymentDate: true,
                reference: true,
                note: true,
                paymentmethod: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        {
          success: false,
          message: "Supplier not found.",
        },
        { status: 404 }
      );
    }

    const openingBalance = Number(supplier.openingBalance);

    const totalDebit = supplier.suppliertransaction.reduce(
      (sum, item) => sum + Number(item.debit),
      0
    );

    const totalCredit = supplier.suppliertransaction.reduce(
      (sum, item) => sum + Number(item.credit),
      0
    );

    const outstanding =
      openingBalance + totalDebit - totalCredit;

    const ledger = supplier.suppliertransaction.map((item) => ({
      id: String(item.id),
      purchaseId: item.purchaseId,
      description: item.description,
      debit: Number(item.debit),
      credit: Number(item.credit),
      createdAt: item.createdAt,
    }));

    const purchases = supplier.purchase.map((purchase) => ({
      id: purchase.id,
      purchaseNo: purchase.purchaseNo,
      purchaseDate: purchase.purchaseDate,
      total: Number(purchase.total),
      paidAmount: Number(purchase.paidAmount),
      balanceAmount: Number(purchase.balanceAmount),
      status: purchase.status,
      payments: purchase.purchasepayment.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        paymentDate: payment.paymentDate,
        reference: payment.reference,
        note: payment.note,
        paymentMethod: payment.paymentmethod.name,
        paymentType: payment.paymentmethod.type,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: {
        supplier: {
          id: supplier.id,
          code: supplier.code,
          name: supplier.name,
          phone: supplier.phone,
        },
        openingBalance,
        totalDebit,
        totalCredit,
        outstanding,
        ledger,
        purchases,
      },
    });
  } catch (error) {
    console.error("GET SUPPLIER STATEMENT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load supplier statement.",
      },
      { status: 500 }
    );
  }
}