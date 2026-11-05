import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "this_month";
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");

    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (range) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case "this_week": {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
        break;
      }
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case "this_year":
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        break;
      case "custom":
        startDate = customFrom ? new Date(`${customFrom}T00:00:00.000Z`) : new Date(now.getFullYear(), now.getMonth(), 1);
        if (customTo) {
          endDate = new Date(`${customTo}T23:59:59.999Z`);
        }
        break;
      case "this_month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
    }

    // 1. Fetch Sales within date range
    const sales = await prisma.sale.findMany({
      where: {
        status: "COMPLETED",
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        saleitem: true,
        payment: {
          include: { paymentmethod: true },
        },
      },
    });

    // Compute Sales Metrics
    let totalSalesRevenue = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalSubtotal = 0;
    let totalCogs = 0; // Cost of goods sold

    const paymentMethodsMap: Record<string, number> = {};

    for (const s of sales) {
      totalSalesRevenue += Number(s.total);
      totalDiscount += Number(s.discount);
      totalTax += Number(s.tax);
      totalSubtotal += Number(s.subtotal);

      for (const item of s.saleitem) {
        const cost = Number(item.costPrice || 0);
        const qty = Number(item.quantity);
        totalCogs += cost * qty;
      }

      // Payments breakdown
      for (const p of s.payment) {
        const pmName = p.paymentmethod?.name || "Cash";
        paymentMethodsMap[pmName] = (paymentMethodsMap[pmName] || 0) + Number(p.amount);
      }
    }

    const grossProfit = totalSalesRevenue - totalCogs;
    const grossMargin = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

    // 2. Fetch Expenses within date range
    const expenses = await prisma.expense.findMany({
      where: {
        status: "ACTIVE",
        expenseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        expensecategory: true,
      },
    });

    let totalExpenses = 0;
    const expensesByCategory: Record<string, number> = {};

    for (const exp of expenses) {
      const amt = Number(exp.amount);
      totalExpenses += amt;
      const cat = exp.expensecategory?.name || "General";
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amt;
    }

    // 3. Compute Net Profit
    const netProfit = grossProfit - totalExpenses;
    const netMargin = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;

    // 4. Fetch Jobs metrics within date range
    const jobs = await prisma.job.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        total: true,
        advanceAmount: true,
        balanceAmount: true,
        status: true,
      },
    });

    const totalJobsCount = jobs.length;
    const totalJobsValue = jobs.reduce((sum, j) => sum + Number(j.total), 0);
    const totalJobsAdvance = jobs.reduce((sum, j) => sum + Number(j.advanceAmount), 0);
    const totalJobsReceivable = jobs.reduce((sum, j) => sum + Number(j.balanceAmount), 0);

    return NextResponse.json({
      success: true,
      period: {
        range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      data: {
        salesCount: sales.length,
        totalRevenue: totalSalesRevenue,
        subtotal: totalSubtotal,
        discount: totalDiscount,
        tax: totalTax,
        cogs: totalCogs,
        grossProfit,
        grossMargin,
        totalExpenses,
        expensesCount: expenses.length,
        netProfit,
        netMargin,
        expensesByCategory,
        paymentMethods: paymentMethodsMap,
        jobs: {
          count: totalJobsCount,
          totalValue: totalJobsValue,
          advanceReceived: totalJobsAdvance,
          receivable: totalJobsReceivable,
        },
      },
    });
  } catch (error) {
    console.error("GET FINANCIAL REPORT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate financial report" },
      { status: 500 }
    );
  }
}

