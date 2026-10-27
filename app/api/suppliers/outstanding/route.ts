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
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const canView = await hasPermission("SUPPLIER_VIEW");

    if (!canView) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You do not have permission to view suppliers.",
        },
        { status: 403 }
      );
    }

    const suppliers = await prisma.supplier.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        openingBalance: true,
        suppliertransaction: {
          select: {
            debit: true,
            credit: true,
          },
        },
      },
    });

    const data = suppliers.map((supplier) => {
      const openingBalance = Number(supplier.openingBalance ?? 0);

      const totalDebit = supplier.suppliertransaction.reduce(
        (sum, transaction) =>
          sum + Number(transaction.debit ?? 0),
        0
      );

      const totalCredit = supplier.suppliertransaction.reduce(
        (sum, transaction) =>
          sum + Number(transaction.credit ?? 0),
        0
      );

      const outstanding =
        openingBalance + totalDebit - totalCredit;

      return {
        id: supplier.id,
        code: supplier.code,
        name: supplier.name,
        phone: supplier.phone,
        openingBalance,
        totalDebit,
        totalCredit,
        outstanding,
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("GET SUPPLIER OUTSTANDING ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load supplier outstanding.",
      },
      { status: 500 }
    );
  }
}