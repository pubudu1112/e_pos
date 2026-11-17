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
      (await hasPermission("REPORT_FINANCIAL_VIEW")) ||
      (await hasPermission("EXPENSE_VIEW"));

    if (!canView) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to view expense reports.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const categoryId = searchParams.get("categoryId") || "ALL";
    const paymentMethodId = searchParams.get("paymentMethodId") || "ALL";

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

    const [categories, paymentMethods] = await Promise.all([
      prisma.expensecategory.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.paymentmethod.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, type: true },
      }),
    ]);

    const whereClause: {
      expenseDate: { gte: Date; lte: Date };
      status: "ACTIVE";
      categoryId?: number;
      paymentMethodId?: number;
    } = {
      expenseDate: {
        gte: fromDate,
        lte: toDate,
      },
      status: "ACTIVE",
    };

    if (categoryId !== "ALL") {
      const parsedCat = Number(categoryId);
      if (!Number.isNaN(parsedCat)) {
        whereClause.categoryId = parsedCat;
      }
    }

    if (paymentMethodId !== "ALL") {
      const parsedPm = Number(paymentMethodId);
      if (!Number.isNaN(parsedPm)) {
        whereClause.paymentMethodId = parsedPm;
      }
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { expenseDate: "desc" },
      include: {
        expensecategory: {
          select: { id: true, name: true },
        },
        paymentmethod: {
          select: { id: true, name: true, type: true },
        },
        user: {
          select: { id: true, username: true, fullName: true },
        },
      },
    });

    let totalAmount = 0;
    let highestExpense = 0;

    const categoryMap = new Map<
      number,
      {
        categoryId: number;
        categoryName: string;
        count: number;
        totalAmount: number;
      }
    >();

    const paymentMethodMap = new Map<
      string,
      {
        name: string;
        count: number;
        totalAmount: number;
      }
    >();

    const dailyMap = new Map<
      string,
      {
        date: string;
        count: number;
        totalAmount: number;
      }
    >();

    const expenseRows = expenses.map((e) => {
      const amount = Number(e.amount);
      totalAmount += amount;
      if (amount > highestExpense) {
        highestExpense = amount;
      }

      const catId = e.expensecategory.id;
      const catName = e.expensecategory.name;
      const catEntry = categoryMap.get(catId) ?? {
        categoryId: catId,
        categoryName: catName,
        count: 0,
        totalAmount: 0,
      };
      catEntry.count += 1;
      catEntry.totalAmount += amount;
      categoryMap.set(catId, catEntry);

      const pmName = e.paymentmethod?.name ?? "Unspecified";
      const pmEntry = paymentMethodMap.get(pmName) ?? {
        name: pmName,
        count: 0,
        totalAmount: 0,
      };
      pmEntry.count += 1;
      pmEntry.totalAmount += amount;
      paymentMethodMap.set(pmName, pmEntry);

      const day = e.expenseDate.toISOString().slice(0, 10);
      const dayEntry = dailyMap.get(day) ?? {
        date: day,
        count: 0,
        totalAmount: 0,
      };
      dayEntry.count += 1;
      dayEntry.totalAmount += amount;
      dailyMap.set(day, dayEntry);

      return {
        id: e.id,
        expenseNo: e.expenseNo,
        expenseDate: e.expenseDate.toISOString(),
        categoryId: catId,
        categoryName: catName,
        description: e.description,
        amount,
        paymentMethodName: pmName,
        createdBy: e.user.fullName || e.user.username,
      };
    });

    const categoryBreakdown = [...categoryMap.values()]
      .map((c) => ({
        ...c,
        sharePercent: totalAmount > 0 ? (c.totalAmount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const paymentBreakdown = [...paymentMethodMap.values()]
      .map((p) => ({
        ...p,
        sharePercent: totalAmount > 0 ? (p.totalAmount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const dailyExpenses = [...dailyMap.values()].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      success: true,
      data: {
        from,
        to,
        categories,
        paymentMethods,
        summary: {
          expenseCount: expenseRows.length,
          categoriesUsed: categoryBreakdown.length,
          activeDays: dailyExpenses.length,
          totalAmount,
          dailyAverage:
            dailyExpenses.length > 0 ? totalAmount / dailyExpenses.length : 0,
          highestExpense,
          topCategoryName: categoryBreakdown[0]?.categoryName ?? "-",
        },
        categoryBreakdown,
        paymentBreakdown,
        dailyExpenses,
        expenses: expenseRows,
      },
    });
  } catch (error) {
    console.error("EXPENSE REPORT ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to load expense report.",
      },
      { status: 500 }
    );
  }
}
