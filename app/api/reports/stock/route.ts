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
      (await hasPermission("INVENTORY_VIEW"));

    if (!canView) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to view stock reports.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const now = new Date();
    const fromDate = from
      ? startOfDay(from)
      : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const toDate = to ? endOfDay(to) : endOfDay(now.toISOString().slice(0, 10));

    const [categories, products, saleItems] = await Promise.all([
      prisma.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.product.findMany({
        orderBy: { name: "asc" },
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          unit: { select: { shortName: true } },
          stock: { select: { quantity: true, reservedQuantity: true } },
        },
      }),
      prisma.saleitem.findMany({
        where: {
          productId: { not: null },
          sale: {
            status: "COMPLETED",
            saleDate: {
              gte: fromDate,
              lte: toDate,
            },
          },
        },
        select: {
          productId: true,
          quantity: true,
          total: true,
          sale: {
            select: {
              saleDate: true,
            },
          },
        },
      }),
    ]);

    // Aggregate sales velocity per product in selected date range
    const salesVelocityMap = new Map<
      number,
      { soldQty: number; salesValue: number; lastSoldAt: string | null }
    >();

    for (const item of saleItems) {
      if (!item.productId) continue;
      const pid = item.productId;
      const qty = Number(item.quantity);
      const val = Number(item.total);
      const saleDateStr = item.sale.saleDate.toISOString();

      const existing = salesVelocityMap.get(pid);
      if (existing) {
        existing.soldQty += qty;
        existing.salesValue += val;
        if (!existing.lastSoldAt || saleDateStr > existing.lastSoldAt) {
          existing.lastSoldAt = saleDateStr;
        }
      } else {
        salesVelocityMap.set(pid, {
          soldQty: qty,
          salesValue: val,
          lastSoldAt: saleDateStr,
        });
      }
    }

    // Determine threshold for Fast Moving (median/top of products with > 0 sales, min 3 units)
    const nonZeroSoldQtys = [...salesVelocityMap.values()]
      .map((v) => v.soldQty)
      .filter((q) => q > 0)
      .sort((a, b) => b - a);

    const fastThreshold =
      nonZeroSoldQtys.length > 0
        ? Math.max(
            3,
            nonZeroSoldQtys[Math.floor(nonZeroSoldQtys.length * 0.35)] ?? 3
          )
        : 5;

    let totalProducts = 0;
    let totalUnitsInStock = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let totalExpectedProfit = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let fastMovingCount = 0;
    let slowMovingCount = 0;
    let deadStockCount = 0;

    type CategoryValuation = {
      categoryId: number;
      categoryName: string;
      productCount: number;
      totalUnits: number;
      costValue: number;
      retailValue: number;
      expectedProfit: number;
      lowStockCount: number;
      outOfStockCount: number;
    };

    const categoryMap = new Map<number, CategoryValuation>();

    const productRows = products.map((p) => {
      const currentStock = p.stock ? Number(p.stock.quantity) : 0;
      const reservedStock = p.stock ? Number(p.stock.reservedQuantity) : 0;
      const availableStock = Math.max(0, currentStock - reservedStock);
      const minimumStock = Number(p.minimumStock);
      const purchasePrice = Number(p.purchasePrice);
      const sellingPrice = Number(p.sellingPrice);

      const positiveStock = Math.max(0, currentStock);
      const stockCostValue = positiveStock * purchasePrice;
      const stockRetailValue = positiveStock * sellingPrice;
      const expectedProfit = stockRetailValue - stockCostValue;

      let stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK";
      if (currentStock <= 0) {
        stockStatus = "OUT_OF_STOCK";
        outOfStockCount += 1;
      } else if (currentStock <= minimumStock) {
        stockStatus = "LOW_STOCK";
        lowStockCount += 1;
      }

      const reorderQty =
        currentStock <= minimumStock
          ? Math.max(0, minimumStock - currentStock)
          : 0;

      const vel = salesVelocityMap.get(p.id) ?? {
        soldQty: 0,
        salesValue: 0,
        lastSoldAt: null,
      };

      let movementType: "FAST_MOVING" | "SLOW_MOVING" | "DEAD_STOCK" =
        "DEAD_STOCK";
      if (vel.soldQty >= fastThreshold) {
        movementType = "FAST_MOVING";
        fastMovingCount += 1;
      } else if (vel.soldQty > 0) {
        movementType = "SLOW_MOVING";
        slowMovingCount += 1;
      } else {
        movementType = "DEAD_STOCK";
        deadStockCount += 1;
      }

      totalProducts += 1;
      totalUnitsInStock += positiveStock;
      totalCostValue += stockCostValue;
      totalRetailValue += stockRetailValue;
      totalExpectedProfit += expectedProfit;

      let catAcc = categoryMap.get(p.category.id);
      if (!catAcc) {
        catAcc = {
          categoryId: p.category.id,
          categoryName: p.category.name,
          productCount: 0,
          totalUnits: 0,
          costValue: 0,
          retailValue: 0,
          expectedProfit: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
        };
        categoryMap.set(p.category.id, catAcc);
      }

      catAcc.productCount += 1;
      catAcc.totalUnits += positiveStock;
      catAcc.costValue += stockCostValue;
      catAcc.retailValue += stockRetailValue;
      catAcc.expectedProfit += expectedProfit;
      if (stockStatus === "LOW_STOCK") catAcc.lowStockCount += 1;
      if (stockStatus === "OUT_OF_STOCK") catAcc.outOfStockCount += 1;

      return {
        id: p.id,
        code: p.code,
        barcode: p.barcode,
        name: p.name,
        status: p.status,
        categoryId: p.category.id,
        categoryName: p.category.name,
        brandName: p.brand?.name ?? null,
        unitName: p.unit.shortName,
        currentStock,
        reservedStock,
        availableStock,
        minimumStock,
        reorderQty,
        purchasePrice,
        sellingPrice,
        stockCostValue,
        stockRetailValue,
        expectedProfit,
        stockStatus,
        soldQtyInPeriod: vel.soldQty,
        salesValueInPeriod: vel.salesValue,
        lastSoldAt: vel.lastSoldAt,
        movementType,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        from: fromDate.toISOString().slice(0, 10),
        to: toDate.toISOString().slice(0, 10),
        categories,
        summary: {
          totalProducts,
          totalUnitsInStock,
          totalCostValue,
          totalRetailValue,
          totalExpectedProfit,
          lowStockCount,
          outOfStockCount,
          fastMovingCount,
          slowMovingCount,
          deadStockCount,
        },
        categoryValuations: [...categoryMap.values()].sort(
          (a, b) => b.costValue - a.costValue
        ),
        products: productRows,
      },
    });
  } catch (error) {
    console.error("STOCK REPORT ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to load stock valuation report.",
      },
      { status: 500 }
    );
  }
}
