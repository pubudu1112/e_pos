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

    if (!(await hasPermission("REPORT_SALES_VIEW"))) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to view category & product reports.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const includeUnsold = searchParams.get("includeUnsold") === "true";

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

    // Fetch all categories, service categories, products, and services for filters and optional unsold rows
    const [productCategories, serviceCategories, allProducts, allServices, sales] =
      await Promise.all([
        prisma.category.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, isActive: true },
        }),
        prisma.servicecategory.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, isActive: true },
        }),
        prisma.product.findMany({
          orderBy: { name: "asc" },
          include: {
            category: { select: { id: true, name: true } },
            brand: { select: { name: true } },
            unit: { select: { shortName: true } },
            stock: { select: { quantity: true } },
          },
        }),
        prisma.service.findMany({
          orderBy: { name: "asc" },
          include: {
            servicecategory: { select: { id: true, name: true } },
          },
        }),
        prisma.sale.findMany({
          where: {
            saleDate: {
              gte: fromDate,
              lte: toDate,
            },
            status: "COMPLETED",
          },
          include: {
            saleitem: {
              include: {
                product: {
                  include: {
                    category: { select: { id: true, name: true } },
                    brand: { select: { name: true } },
                    unit: { select: { shortName: true } },
                    stock: { select: { quantity: true } },
                  },
                },
                service: {
                  include: {
                    servicecategory: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        }),
      ]);

    type ItemRow = {
      itemKey: string;
      id: number | null;
      code: string;
      barcode: string | null;
      name: string;
      itemType: "PRODUCT" | "SERVICE";
      categoryKey: string;
      categoryName: string;
      brandName: string | null;
      unitName: string;
      currentStock: number | null;
      unitSellingPrice: number;
      unitCostPrice: number;
      invoiceIds: Set<number>;
      quantitySold: number;
      lineDiscount: number;
      allocatedDiscount: number;
      tax: number;
      grossSalesValue: number;
      netSalesValue: number;
      totalCost: number;
    };

    const itemMap = new Map<string, ItemRow>();

    // Pre-populate if includeUnsold is enabled
    if (includeUnsold) {
      for (const prod of allProducts) {
        const itemKey = `prod-${prod.id}`;
        const categoryKey = `pcat-${prod.category.id}`;
        itemMap.set(itemKey, {
          itemKey,
          id: prod.id,
          code: prod.code,
          barcode: prod.barcode ?? null,
          name: prod.name,
          itemType: "PRODUCT",
          categoryKey,
          categoryName: prod.category.name,
          brandName: prod.brand?.name ?? null,
          unitName: prod.unit.shortName,
          currentStock: prod.stock ? Number(prod.stock.quantity) : 0,
          unitSellingPrice: Number(prod.sellingPrice),
          unitCostPrice: Number(prod.purchasePrice),
          invoiceIds: new Set(),
          quantitySold: 0,
          lineDiscount: 0,
          allocatedDiscount: 0,
          tax: 0,
          grossSalesValue: 0,
          netSalesValue: 0,
          totalCost: 0,
        });
      }

      for (const srv of allServices) {
        const itemKey = `srv-${srv.id}`;
        const categoryKey = `scat-${srv.servicecategory.id}`;
        const unitCost =
          Number(srv.paperCost) + Number(srv.tonerCost) + Number(srv.machineCost);
        itemMap.set(itemKey, {
          itemKey,
          id: srv.id,
          code: srv.code,
          barcode: null,
          name: srv.name,
          itemType: "SERVICE",
          categoryKey,
          categoryName: srv.servicecategory.name,
          brandName: null,
          unitName: "job",
          currentStock: null,
          unitSellingPrice: Number(srv.basePrice),
          unitCostPrice: unitCost,
          invoiceIds: new Set(),
          quantitySold: 0,
          lineDiscount: 0,
          allocatedDiscount: 0,
          tax: 0,
          grossSalesValue: 0,
          netSalesValue: 0,
          totalCost: 0,
        });
      }
    }

    for (const sale of sales) {
      const saleDiscount = Number(sale.discount);

      const itemsWithSubtotals = sale.saleitem.map((item) => {
        const quantity = Number(item.quantity);
        const lineTotal = Number(item.total);
        const lineTax = Number(item.tax);
        const lineDiscount = Number(item.discount);
        const lineSubtotal = Math.max(0, lineTotal - lineTax);
        return {
          item,
          quantity,
          lineTotal,
          lineTax,
          lineDiscount,
          lineSubtotal,
        };
      });

      const itemsSubtotalSum = itemsWithSubtotals.reduce(
        (sum, entry) => sum + entry.lineSubtotal,
        0
      );

      const discountToAllocate = Math.min(
        Math.max(0, saleDiscount),
        itemsSubtotalSum
      );

      for (const entry of itemsWithSubtotals) {
        const { item, quantity, lineTotal, lineTax, lineDiscount, lineSubtotal } =
          entry;

        const discountShare =
          itemsSubtotalSum > 0
            ? (lineSubtotal / itemsSubtotalSum) * discountToAllocate
            : 0;

        const netLineSales = Math.max(0, lineSubtotal - discountShare);

        if (item.product) {
          const prod = item.product;
          const itemKey = `prod-${prod.id}`;
          const categoryKey = `pcat-${prod.category.id}`;
          const unitCost =
            item.costPrice !== null
              ? Number(item.costPrice)
              : Number(prod.purchasePrice);

          let row = itemMap.get(itemKey);
          if (!row) {
            row = {
              itemKey,
              id: prod.id,
              code: prod.code,
              barcode: prod.barcode ?? null,
              name: prod.name,
              itemType: "PRODUCT",
              categoryKey,
              categoryName: prod.category.name,
              brandName: prod.brand?.name ?? null,
              unitName: prod.unit.shortName,
              currentStock: prod.stock ? Number(prod.stock.quantity) : 0,
              unitSellingPrice: Number(prod.sellingPrice),
              unitCostPrice: Number(prod.purchasePrice),
              invoiceIds: new Set(),
              quantitySold: 0,
              lineDiscount: 0,
              allocatedDiscount: 0,
              tax: 0,
              grossSalesValue: 0,
              netSalesValue: 0,
              totalCost: 0,
            };
            itemMap.set(itemKey, row);
          }

          row.invoiceIds.add(sale.id);
          row.quantitySold += quantity;
          row.lineDiscount += lineDiscount;
          row.allocatedDiscount += discountShare;
          row.tax += lineTax;
          row.grossSalesValue += lineTotal;
          row.netSalesValue += netLineSales;
          row.totalCost += unitCost * quantity;
        } else if (item.service) {
          const srv = item.service;
          const itemKey = `srv-${srv.id}`;
          const categoryKey = `scat-${srv.servicecategory.id}`;
          const fallbackSrvCost =
            Number(srv.paperCost) +
            Number(srv.tonerCost) +
            Number(srv.machineCost);
          const unitCost =
            item.costPrice !== null ? Number(item.costPrice) : fallbackSrvCost;

          let row = itemMap.get(itemKey);
          if (!row) {
            row = {
              itemKey,
              id: srv.id,
              code: srv.code,
              barcode: null,
              name: srv.name,
              itemType: "SERVICE",
              categoryKey,
              categoryName: srv.servicecategory.name,
              brandName: null,
              unitName: "job",
              currentStock: null,
              unitSellingPrice: Number(srv.basePrice),
              unitCostPrice: fallbackSrvCost,
              invoiceIds: new Set(),
              quantitySold: 0,
              lineDiscount: 0,
              allocatedDiscount: 0,
              tax: 0,
              grossSalesValue: 0,
              netSalesValue: 0,
              totalCost: 0,
            };
            itemMap.set(itemKey, row);
          }

          row.invoiceIds.add(sale.id);
          row.quantitySold += quantity;
          row.lineDiscount += lineDiscount;
          row.allocatedDiscount += discountShare;
          row.tax += lineTax;
          row.grossSalesValue += lineTotal;
          row.netSalesValue += netLineSales;
          row.totalCost += unitCost * quantity;
        }
      }
    }

    const products = [...itemMap.values()]
      .map((r) => {
        const totalDiscount = r.lineDiscount + r.allocatedDiscount;
        const grossProfit = r.netSalesValue - r.totalCost;
        const profitMargin =
          r.netSalesValue > 0 ? (grossProfit / r.netSalesValue) * 100 : 0;

        return {
          itemKey: r.itemKey,
          id: r.id,
          code: r.code,
          barcode: r.barcode,
          name: r.name,
          itemType: r.itemType,
          categoryKey: r.categoryKey,
          categoryName: r.categoryName,
          brandName: r.brandName,
          unitName: r.unitName,
          currentStock: r.currentStock,
          unitSellingPrice: r.unitSellingPrice,
          unitCostPrice: r.unitCostPrice,
          invoiceCount: r.invoiceIds.size,
          quantitySold: r.quantitySold,
          totalDiscount,
          tax: r.tax,
          grossSalesValue: r.grossSalesValue,
          netSalesValue: r.netSalesValue,
          totalCost: r.totalCost,
          grossProfit,
          profitMargin,
        };
      })
      .sort((a, b) => b.grossSalesValue - a.grossSalesValue);

    type CategorySummary = {
      categoryKey: string;
      categoryName: string;
      categoryType: "PRODUCT" | "SERVICE";
      distinctItemsCount: number;
      totalQuantity: number;
      totalDiscount: number;
      totalTax: number;
      grossSalesValue: number;
      netSalesValue: number;
      totalCost: number;
      grossProfit: number;
      profitMargin: number;
      items: typeof products;
    };

    const categoryMap = new Map<string, CategorySummary>();

    for (const p of products) {
      let cat = categoryMap.get(p.categoryKey);
      if (!cat) {
        cat = {
          categoryKey: p.categoryKey,
          categoryName: p.categoryName,
          categoryType: p.itemType,
          distinctItemsCount: 0,
          totalQuantity: 0,
          totalDiscount: 0,
          totalTax: 0,
          grossSalesValue: 0,
          netSalesValue: 0,
          totalCost: 0,
          grossProfit: 0,
          profitMargin: 0,
          items: [],
        };
        categoryMap.set(p.categoryKey, cat);
      }

      cat.distinctItemsCount += 1;
      cat.totalQuantity += p.quantitySold;
      cat.totalDiscount += p.totalDiscount;
      cat.totalTax += p.tax;
      cat.grossSalesValue += p.grossSalesValue;
      cat.netSalesValue += p.netSalesValue;
      cat.totalCost += p.totalCost;
      cat.grossProfit += p.grossProfit;
      cat.items.push(p);
    }

    const categories = [...categoryMap.values()]
      .map((cat) => ({
        ...cat,
        profitMargin:
          cat.netSalesValue > 0
            ? (cat.grossProfit / cat.netSalesValue) * 100
            : 0,
      }))
      .sort((a, b) => b.grossSalesValue - a.grossSalesValue);

    const categoriesList = [
      ...productCategories.map((c) => ({
        categoryKey: `pcat-${c.id}`,
        name: c.name,
        type: "PRODUCT" as const,
      })),
      ...serviceCategories.map((c) => ({
        categoryKey: `scat-${c.id}`,
        name: c.name,
        type: "SERVICE" as const,
      })),
    ];

    const totalQuantity = categories.reduce((s, c) => s + c.totalQuantity, 0);
    const totalDiscount = categories.reduce((s, c) => s + c.totalDiscount, 0);
    const totalTax = categories.reduce((s, c) => s + c.totalTax, 0);
    const grossSalesValue = categories.reduce(
      (s, c) => s + c.grossSalesValue,
      0
    );
    const netSalesValue = categories.reduce((s, c) => s + c.netSalesValue, 0);
    const totalCost = categories.reduce((s, c) => s + c.totalCost, 0);
    const grossProfit = netSalesValue - totalCost;
    const profitMargin =
      netSalesValue > 0 ? (grossProfit / netSalesValue) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        from,
        to,
        categoriesList,
        summary: {
          categoriesCount: categories.filter((c) => c.totalQuantity > 0).length,
          distinctProductsSold: products.filter((p) => p.quantitySold > 0)
            .length,
          totalQuantity,
          totalDiscount,
          totalTax,
          grossSalesValue,
          netSalesValue,
          totalCost,
          grossProfit,
          profitMargin,
        },
        categories,
        products,
      },
    });
  } catch (error) {
    console.error("CATEGORY PRODUCT REPORT ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to load category and product report.",
      },
      { status: 500 }
    );
  }
}
