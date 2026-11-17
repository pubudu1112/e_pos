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
          message: "You do not have permission to view customer reports.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const customerFilter = searchParams.get("customerId") || "ALL";

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

    // Load all active customers for filter dropdown
    const allCustomers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
      },
    });

    const whereClause: {
      saleDate: { gte: Date; lte: Date };
      status: "COMPLETED";
      customerId?: number | null;
    } = {
      saleDate: {
        gte: fromDate,
        lte: toDate,
      },
      status: "COMPLETED",
    };

    if (customerFilter === "WALK_IN") {
      whereClause.customerId = null;
    } else if (customerFilter !== "ALL") {
      const parsedId = Number(customerFilter);
      if (!Number.isNaN(parsedId)) {
        whereClause.customerId = parsedId;
      }
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      orderBy: { saleDate: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        saleitem: {
          include: {
            product: {
              select: {
                id: true,
                code: true,
                name: true,
                category: {
                  select: { name: true },
                },
                unit: {
                  select: { shortName: true },
                },
              },
            },
            service: {
              select: {
                id: true,
                code: true,
                name: true,
                servicecategory: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    type PurchasedItemDetail = {
      saleId: number;
      invoiceNo: string;
      saleDate: string;
      itemKey: string;
      itemCode: string;
      itemName: string;
      itemType: "PRODUCT" | "SERVICE" | "CUSTOM";
      categoryName: string;
      unitName: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      tax: number;
      total: number;
    };

    type GroupedItemSummary = {
      itemKey: string;
      itemCode: string;
      itemName: string;
      itemType: "PRODUCT" | "SERVICE" | "CUSTOM";
      categoryName: string;
      unitName: string;
      totalQuantity: number;
      totalDiscount: number;
      totalTax: number;
      totalValue: number;
    };

    type CustomerAccumulator = {
      customerKey: string;
      customerId: number | null;
      customerCode: string;
      customerName: string;
      customerPhone: string | null;
      invoiceCount: number;
      totalQuantity: number;
      subtotal: number;
      discount: number;
      tax: number;
      totalValue: number;
      paidAmount: number;
      balanceAmount: number;
      groupedItemsMap: Map<string, GroupedItemSummary>;
      purchases: PurchasedItemDetail[];
    };

    const customerMap = new Map<string, CustomerAccumulator>();

    let grandInvoices = 0;
    let grandQuantity = 0;
    let grandSubtotal = 0;
    let grandDiscount = 0;
    let grandTax = 0;
    let grandTotal = 0;
    let grandPaid = 0;
    let grandBalance = 0;

    for (const sale of sales) {
      const customerKey = sale.customer ? `cust-${sale.customer.id}` : "walk-in";
      const customerName = sale.customer?.name ?? "Walk-in Customer";
      const customerCode = sale.customer?.code ?? "WALK-IN";
      const customerPhone = sale.customer?.phone ?? null;

      let custAcc = customerMap.get(customerKey);
      if (!custAcc) {
        custAcc = {
          customerKey,
          customerId: sale.customer?.id ?? null,
          customerCode,
          customerName,
          customerPhone,
          invoiceCount: 0,
          totalQuantity: 0,
          subtotal: 0,
          discount: 0,
          tax: 0,
          totalValue: 0,
          paidAmount: 0,
          balanceAmount: 0,
          groupedItemsMap: new Map(),
          purchases: [],
        };
        customerMap.set(customerKey, custAcc);
      }

      const saleSubtotal = Number(sale.subtotal);
      const saleDiscount = Number(sale.discount);
      const saleTax = Number(sale.tax);
      const saleTotal = Number(sale.total);
      const salePaid = Number(sale.paidAmount);
      const saleBalance = Number(sale.balanceAmount);

      custAcc.invoiceCount += 1;
      custAcc.subtotal += saleSubtotal;
      custAcc.discount += saleDiscount;
      custAcc.tax += saleTax;
      custAcc.totalValue += saleTotal;
      custAcc.paidAmount += salePaid;
      custAcc.balanceAmount += saleBalance;

      grandInvoices += 1;
      grandSubtotal += saleSubtotal;
      grandDiscount += saleDiscount;
      grandTax += saleTax;
      grandTotal += saleTotal;
      grandPaid += salePaid;
      grandBalance += saleBalance;

      for (const item of sale.saleitem) {
        const qty = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        const lineDiscount = Number(item.discount);
        const lineTax = Number(item.tax);
        const lineTotal = Number(item.total);

        let itemKey = `custom-${item.description ?? "item"}`;
        let itemCode = "-";
        let itemName = item.description || "Custom Item";
        let itemType: "PRODUCT" | "SERVICE" | "CUSTOM" = "CUSTOM";
        let categoryName = "Uncategorized";
        let unitName = "pcs";

        if (item.product) {
          itemKey = `prod-${item.product.id}`;
          itemCode = item.product.code;
          itemName = item.product.name;
          itemType = "PRODUCT";
          categoryName = item.product.category?.name ?? "Uncategorized";
          unitName = item.product.unit?.shortName ?? "pcs";
        } else if (item.service) {
          itemKey = `srv-${item.service.id}`;
          itemCode = item.service.code;
          itemName = item.service.name;
          itemType = "SERVICE";
          categoryName = item.service.servicecategory?.name ?? "Service";
          unitName = "job";
        }

        custAcc.totalQuantity += qty;
        grandQuantity += qty;

        custAcc.purchases.push({
          saleId: sale.id,
          invoiceNo: sale.invoiceNo,
          saleDate: sale.saleDate.toISOString(),
          itemKey,
          itemCode,
          itemName,
          itemType,
          categoryName,
          unitName,
          quantity: qty,
          unitPrice,
          discount: lineDiscount,
          tax: lineTax,
          total: lineTotal,
        });

        const existingGroup = custAcc.groupedItemsMap.get(itemKey);
        if (existingGroup) {
          existingGroup.totalQuantity += qty;
          existingGroup.totalDiscount += lineDiscount;
          existingGroup.totalTax += lineTax;
          existingGroup.totalValue += lineTotal;
        } else {
          custAcc.groupedItemsMap.set(itemKey, {
            itemKey,
            itemCode,
            itemName,
            itemType,
            categoryName,
            unitName,
            totalQuantity: qty,
            totalDiscount: lineDiscount,
            totalTax: lineTax,
            totalValue: lineTotal,
          });
        }
      }
    }

    const customers = [...customerMap.values()]
      .map((c) => ({
        customerKey: c.customerKey,
        customerId: c.customerId,
        customerCode: c.customerCode,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        invoiceCount: c.invoiceCount,
        totalQuantity: c.totalQuantity,
        subtotal: c.subtotal,
        discount: c.discount,
        tax: c.tax,
        totalValue: c.totalValue,
        paidAmount: c.paidAmount,
        balanceAmount: c.balanceAmount,
        groupedItems: [...c.groupedItemsMap.values()].sort(
          (a, b) => b.totalValue - a.totalValue
        ),
        purchases: c.purchases,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    return NextResponse.json({
      success: true,
      data: {
        from,
        to,
        allCustomers,
        summary: {
          customerCount: customers.length,
          invoiceCount: grandInvoices,
          totalQuantity: grandQuantity,
          subtotal: grandSubtotal,
          discount: grandDiscount,
          tax: grandTax,
          totalValue: grandTotal,
          paidAmount: grandPaid,
          balanceAmount: grandBalance,
        },
        customers,
      },
    });
  } catch (error) {
    console.error("CUSTOMER REPORT ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to load customer report.",
      },
      { status: 500 }
    );
  }
}
