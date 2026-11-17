import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59.999`);
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    const canView =
      (await hasPermission("REPORT_SALES_VIEW")) ||
      (await hasPermission("PURCHASE_VIEW")) ||
      (await hasPermission("SUPPLIER_VIEW"));

    if (!canView) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to view supplier & purchase reports.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const supplierFilter = searchParams.get("supplierId") || "ALL";
    const statusFilter = searchParams.get("status") || "ALL";

    if (!from || !to) {
      return NextResponse.json(
        { success: false, message: "From and To dates are required." },
        { status: 400 }
      );
    }

    const fromDate = startOfDay(from);
    const toDate = endOfDay(to);

    if (
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(toDate.getTime()) ||
      fromDate > toDate
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid date range." },
        { status: 400 }
      );
    }

    const allSuppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        openingBalance: true,
      },
    });

    const whereClause: {
      purchaseDate: { gte: Date; lte: Date };
      supplierId?: number;
      status?: "PENDING" | "PARTIAL" | "PAID" | "REFUNDED";
    } = {
      purchaseDate: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (supplierFilter !== "ALL") {
      const parsedId = Number(supplierFilter);
      if (!Number.isNaN(parsedId)) {
        whereClause.supplierId = parsedId;
      }
    }

    if (
      statusFilter === "PENDING" ||
      statusFilter === "PARTIAL" ||
      statusFilter === "PAID" ||
      statusFilter === "REFUNDED"
    ) {
      whereClause.status = statusFilter;
    }

    const purchases = await prisma.purchase.findMany({
      where: whereClause,
      orderBy: { purchaseDate: "desc" },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        user: {
          select: {
            username: true,
          },
        },
        purchaseitem: {
          include: {
            product: {
              select: {
                id: true,
                code: true,
                name: true,
                category: { select: { name: true } },
                unit: { select: { shortName: true } },
              },
            },
          },
        },
      },
    });

    type PurchaseLineDetail = {
      purchaseId: number;
      purchaseNo: string;
      purchaseDate: string;
      status: string;
      productId: number;
      productCode: string;
      productName: string;
      categoryName: string;
      unitName: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      total: number;
    };

    type GroupedProductItem = {
      productId: number;
      productCode: string;
      productName: string;
      categoryName: string;
      unitName: string;
      totalQuantity: number;
      minUnitPrice: number;
      maxUnitPrice: number;
      totalDiscount: number;
      totalValue: number;
    };

    type SupplierAccumulator = {
      supplierId: number;
      supplierCode: string;
      supplierName: string;
      supplierPhone: string | null;
      purchaseCount: number;
      totalQuantity: number;
      subtotal: number;
      discount: number;
      tax: number;
      totalValue: number;
      paidAmount: number;
      balanceAmount: number;
      groupedProductsMap: Map<number, GroupedProductItem>;
      lines: PurchaseLineDetail[];
    };

    const supplierMap = new Map<number, SupplierAccumulator>();

    let grandPurchases = 0;
    let grandQuantity = 0;
    let grandSubtotal = 0;
    let grandDiscount = 0;
    let grandTax = 0;
    let grandTotal = 0;
    let grandPaid = 0;
    let grandBalance = 0;

    for (const p of purchases) {
      const sup = p.supplier;
      let supAcc = supplierMap.get(sup.id);

      if (!supAcc) {
        supAcc = {
          supplierId: sup.id,
          supplierCode: sup.code,
          supplierName: sup.name,
          supplierPhone: sup.phone ?? null,
          purchaseCount: 0,
          totalQuantity: 0,
          subtotal: 0,
          discount: 0,
          tax: 0,
          totalValue: 0,
          paidAmount: 0,
          balanceAmount: 0,
          groupedProductsMap: new Map(),
          lines: [],
        };
        supplierMap.set(sup.id, supAcc);
      }

      const sub = Number(p.subtotal);
      const disc = Number(p.discount);
      const tx = Number(p.tax);
      const tot = Number(p.total);
      const paid = Number(p.paidAmount);
      const bal = Number(p.balanceAmount);

      supAcc.purchaseCount += 1;
      supAcc.subtotal += sub;
      supAcc.discount += disc;
      supAcc.tax += tx;
      supAcc.totalValue += tot;
      supAcc.paidAmount += paid;
      supAcc.balanceAmount += bal;

      grandPurchases += 1;
      grandSubtotal += sub;
      grandDiscount += disc;
      grandTax += tx;
      grandTotal += tot;
      grandPaid += paid;
      grandBalance += bal;

      for (const item of p.purchaseitem) {
        const qty = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        const lineDisc = Number(item.discount);
        const lineTot = Number(item.total);
        const prod = item.product;

        supAcc.totalQuantity += qty;
        grandQuantity += qty;

        supAcc.lines.push({
          purchaseId: p.id,
          purchaseNo: p.purchaseNo,
          purchaseDate: p.purchaseDate.toISOString(),
          status: p.status,
          productId: prod.id,
          productCode: prod.code,
          productName: prod.name,
          categoryName: prod.category?.name ?? "Uncategorized",
          unitName: prod.unit?.shortName ?? "pcs",
          quantity: qty,
          unitPrice,
          discount: lineDisc,
          total: lineTot,
        });

        const existingGroup = supAcc.groupedProductsMap.get(prod.id);
        if (existingGroup) {
          existingGroup.totalQuantity += qty;
          existingGroup.minUnitPrice = Math.min(
            existingGroup.minUnitPrice,
            unitPrice
          );
          existingGroup.maxUnitPrice = Math.max(
            existingGroup.maxUnitPrice,
            unitPrice
          );
          existingGroup.totalDiscount += lineDisc;
          existingGroup.totalValue += lineTot;
        } else {
          supAcc.groupedProductsMap.set(prod.id, {
            productId: prod.id,
            productCode: prod.code,
            productName: prod.name,
            categoryName: prod.category?.name ?? "Uncategorized",
            unitName: prod.unit?.shortName ?? "pcs",
            totalQuantity: qty,
            minUnitPrice: unitPrice,
            maxUnitPrice: unitPrice,
            totalDiscount: lineDisc,
            totalValue: lineTot,
          });
        }
      }
    }

    const suppliers = [...supplierMap.values()]
      .map((s) => ({
        supplierId: s.supplierId,
        supplierCode: s.supplierCode,
        supplierName: s.supplierName,
        supplierPhone: s.supplierPhone,
        purchaseCount: s.purchaseCount,
        totalQuantity: s.totalQuantity,
        subtotal: s.subtotal,
        discount: s.discount,
        tax: s.tax,
        totalValue: s.totalValue,
        paidAmount: s.paidAmount,
        balanceAmount: s.balanceAmount,
        groupedProducts: [...s.groupedProductsMap.values()].sort(
          (a, b) => b.totalValue - a.totalValue
        ),
        lines: s.lines,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    return NextResponse.json({
      success: true,
      data: {
        from,
        to,
        allSuppliers: allSuppliers.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          phone: s.phone,
        })),
        summary: {
          supplierCount: suppliers.length,
          purchaseCount: grandPurchases,
          totalQuantity: grandQuantity,
          subtotal: grandSubtotal,
          discount: grandDiscount,
          tax: grandTax,
          totalValue: grandTotal,
          paidAmount: grandPaid,
          balanceAmount: grandBalance,
        },
        suppliers,
      },
    });
  } catch (error) {
    console.error("SUPPLIER PURCHASE REPORT ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to load supplier & purchase report.",
      },
      { status: 500 }
    );
  }
}
