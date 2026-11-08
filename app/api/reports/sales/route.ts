
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
          message: "You do not have permission to view sales reports.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

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

    const sales = await prisma.sale.findMany({
      where: {
        saleDate: {
          gte: fromDate,
          lte: toDate,
        },
        status: "COMPLETED",
      },
      orderBy: { saleDate: "asc" },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, username: true },
        },
        saleitem: {
          include: {
            product: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            service: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        payment: {
          include: {
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
    });

    // Overall totals
    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    let total = 0;
    let paidAmount = 0;
    let balanceAmount = 0;

    // Product totals
    let productSales = 0;
    let productCost = 0;

    // Service totals
    let serviceSales = 0;
    let serviceCost = 0;

    // Cost validation
    let missingCostPriceCount = 0;

    const paymentMethods = new Map<string, number>();

    const productMap = new Map<
      string,
      { name: string; quantity: number; sales: number }
    >();

    const serviceMap = new Map<
      string,
      { name: string; quantity: number; sales: number }
    >();

    const dailyMap = new Map<
      string,
      { sales: number; invoices: number }
    >();

    for (const sale of sales) {
      const saleSubtotal = Number(sale.subtotal);
      const saleDiscount = Number(sale.discount);
      const saleTax = Number(sale.tax);
      const saleTotal = Number(sale.total);

      subtotal += saleSubtotal;
      discount += saleDiscount;
      tax += saleTax;
      total += saleTotal;
      paidAmount += Number(sale.paidAmount);
      balanceAmount += Number(sale.balanceAmount);

      // Daily sales (tax-inclusive invoice total)
      const day = sale.saleDate.toISOString().slice(0, 10);

      const daily = dailyMap.get(day) ?? {
        sales: 0,
        invoices: 0,
      };

      daily.sales += saleTotal;
      daily.invoices += 1;

      dailyMap.set(day, daily);

      // Payment methods
      for (const payment of sale.payment) {
        const key = payment.paymentmethod.name;

        paymentMethods.set(
          key,
          (paymentMethods.get(key) ?? 0) + Number(payment.amount)
        );
      }

      // Calculate item subtotals before allocating invoice discount.
      const itemsWithValues = sale.saleitem.map((item) => {
        const quantity = Number(item.quantity);
        const lineTotal = Number(item.total);
        const lineTax = Number(item.tax);

        // Assumption: item.total includes its tax.
        const lineSubtotal = Math.max(0, lineTotal - lineTax);

        return {
          item,
          quantity,
          lineTotal,
          lineTax,
          lineSubtotal,
        };
      });

      const itemsSubtotal = itemsWithValues.reduce(
        (sum, entry) => sum + entry.lineSubtotal,
        0
      );

      // Allocate invoice discount proportionally across items.
      // Discount is allocated against pre-tax item subtotals.
      const discountToAllocate = Math.min(
        Math.max(0, saleDiscount),
        itemsSubtotal
      );

      for (const entry of itemsWithValues) {
        const {
          item,
          quantity,
          lineSubtotal,
        } = entry;

        const discountShare =
          itemsSubtotal > 0
            ? (lineSubtotal / itemsSubtotal) * discountToAllocate
            : 0;

        const netLineSales = Math.max(
          0,
          lineSubtotal - discountShare
        );

        const itemCost =
          item.costPrice === null
            ? null
            : Number(item.costPrice) * quantity;

        // Count missing costs only for actual product/service items.
        if ((item.product || item.service) && itemCost === null) {
          missingCostPriceCount++;
        }

        // Product Sales
        if (item.product) {
          productSales += netLineSales;

          if (itemCost !== null) {
            productCost += itemCost;
          }

          const key = String(item.product.id);

          const current = productMap.get(key) ?? {
            name: item.product.name,
            quantity: 0,
            sales: 0,
          };

          current.quantity += quantity;
          current.sales += netLineSales;

          productMap.set(key, current);
        }

        // Service Sales
        if (item.service) {
          serviceSales += netLineSales;

          if (itemCost !== null) {
            serviceCost += itemCost;
          }

          const key = String(item.service.id);

          const current = serviceMap.get(key) ?? {
            name: item.service.name,
            quantity: 0,
            sales: 0,
          };

          current.quantity += quantity;
          current.sales += netLineSales;

          serviceMap.set(key, current);
        }
      }
    }

    // Profit calculations
    // Sales values exclude tax and include allocated discounts.
    const totalSales = productSales + serviceSales;

    const totalCogs = productCost + serviceCost;

    const productGrossProfit = productSales - productCost;

    const serviceGrossProfit = serviceSales - serviceCost;

    const totalGrossProfit = totalSales - totalCogs;

    const costDataComplete = missingCostPriceCount === 0;

    return NextResponse.json({
      success: true,
      data: {
        from,
        to,

        invoiceCount: sales.length,

        subtotal,
        discount,
        tax,
        total,

        paidAmount,
        balanceAmount,

        // Product
        productSales,
        productCost,
        productGrossProfit,

        // Service
        serviceSales,
        serviceCost,
        serviceGrossProfit,

        // Overall
        totalSales,
        totalCogs,
        totalGrossProfit,

        // Cost validation
        missingCostPriceCount,
        costDataComplete,

        // Backward compatibility:
        // This represents service revenue, not service profit.
        serviceSalesWithoutCost: serviceSales,

        paymentMethods: [...paymentMethods.entries()]
          .map(([name, amount]) => ({
            name,
            amount,
          }))
          .sort((a, b) => b.amount - a.amount),

        dailySales: [...dailyMap.entries()].map(
          ([date, value]) => ({
            date,
            ...value,
          })
        ),

        topProducts: [...productMap.values()]
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 10),

        topServices: [...serviceMap.values()]
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 10),

        sales: sales.map((sale) => ({
          invoiceNo: sale.invoiceNo,
          saleDate: sale.saleDate,
          customer: sale.customer?.name ?? "Walk-in Customer",
          cashier: sale.user.username,

          subtotal: Number(sale.subtotal),
          discount: Number(sale.discount),
          tax: Number(sale.tax),
          total: Number(sale.total),

          paidAmount: Number(sale.paidAmount),
          balanceAmount: Number(sale.balanceAmount),

          paymentMethods: sale.payment.map((payment) => ({
            name: payment.paymentmethod.name,
            amount: Number(payment.amount),
          })),
        })),
      },
    });
  } catch (error) {
    console.error("SALES REPORT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load sales report.",
      },
      { status: 500 }
    );
  }
}
