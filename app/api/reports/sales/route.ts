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
        { success: false, message: "You do not have permission to view sales reports." },
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

    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    let total = 0;
    let paidAmount = 0;
    let balanceAmount = 0;
    let productSales = 0;
    let serviceSales = 0;
    let productCost = 0;
    let serviceSalesWithoutCost = 0;

    const paymentMethods = new Map<string, number>();
    const productMap = new Map<string, { name: string; quantity: number; sales: number }>();
    const serviceMap = new Map<string, { name: string; quantity: number; sales: number }>();
    const dailyMap = new Map<string, { sales: number; invoices: number }>();

    for (const sale of sales) {
      const saleTotal = Number(sale.total);
      subtotal += Number(sale.subtotal);
      discount += Number(sale.discount);
      tax += Number(sale.tax);
      total += saleTotal;
      paidAmount += Number(sale.paidAmount);
      balanceAmount += Number(sale.balanceAmount);

      const day = sale.saleDate.toISOString().slice(0, 10);
      const daily = dailyMap.get(day) ?? { sales: 0, invoices: 0 };
      daily.sales += saleTotal;
      daily.invoices += 1;
      dailyMap.set(day, daily);

      for (const payment of sale.payment) {
        const key = payment.paymentmethod.name;
        paymentMethods.set(
          key,
          (paymentMethods.get(key) ?? 0) + Number(payment.amount)
        );
      }

      for (const item of sale.saleitem) {
        const quantity = Number(item.quantity);
        const lineTotal = Number(item.total);

        if (item.product) {
          productSales += lineTotal;
          productCost += item.costPrice === null
            ? 0
            : Number(item.costPrice) * quantity;

          const key = String(item.product.id);
          const current = productMap.get(key) ?? {
            name: item.product.name,
            quantity: 0,
            sales: 0,
          };
          current.quantity += quantity;
          current.sales += lineTotal;
          productMap.set(key, current);
        }

        if (item.service) {
          serviceSales += lineTotal;
          serviceSalesWithoutCost += lineTotal;

          const key = String(item.service.id);
          const current = serviceMap.get(key) ?? {
            name: item.service.name,
            quantity: 0,
            sales: 0,
          };
          current.quantity += quantity;
          current.sales += lineTotal;
          serviceMap.set(key, current);
        }
      }
    }

    const productGrossProfit = productSales - productCost;

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
        productSales,
        serviceSales,
        productCost,
        productGrossProfit,
        serviceSalesWithoutCost,
        paymentMethods: [...paymentMethods.entries()]
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount),
        dailySales: [...dailyMap.entries()].map(([date, value]) => ({
          date,
          ...value,
        })),
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
      { success: false, message: "Unable to load sales report." },
      { status: 500 }
    );
  }
}
