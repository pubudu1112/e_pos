import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";


async function generateExpenseNo(): Promise<string> {
  const now = new Date();

  const yearMonth = `${now.getFullYear()}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const prefix = `EXP-${yearMonth}-`;

  // Use BINARY comparison to avoid MySQL collation mismatch.
  const latest = await prisma.$queryRaw<
    Array<{ expenseNo: string }>
  >`
    SELECT \`expenseNo\`
    FROM \`Expense\`
    WHERE BINARY \`expenseNo\` LIKE BINARY ${`${prefix}%`}
    ORDER BY \`id\` DESC
    LIMIT 1
  `;

  let nextSeq = 1;

  if (latest.length > 0 && latest[0].expenseNo) {
    const parts = latest[0].expenseNo.split("-");
    const num = parseInt(parts[2], 10);

    if (!isNaN(num)) {
      nextSeq = num + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}


export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: any = {};

    if (search) {
      where.OR = [
        { expenseNo: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (categoryId && categoryId !== "ALL") {
      where.categoryId = parseInt(categoryId, 10);
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.expenseDate = {};
      if (dateFrom) {
        where.expenseDate.gte = new Date(`${dateFrom}T00:00:00.000Z`);
      }
      if (dateTo) {
        where.expenseDate.lte = new Date(`${dateTo}T23:59:59.999Z`);
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      include: {
        expensecategory: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, username: true } },
        paymentmethod: { select: { id: true, name: true, type: true } },
      },
    });

    // Calculate summaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const activeExpenses = expenses.filter((e) => e.status === "ACTIVE");

    const totalFiltered = activeExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Monthly & Today totals (independent of filter for top KPI cards)
    const monthExpenses = await prisma.expense.findMany({
      where: {
        status: "ACTIVE",
        expenseDate: { gte: startOfMonth },
      },
      select: { amount: true, categoryId: true },
    });
    const monthlyTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const todayExpenses = await prisma.expense.findMany({
      where: {
        status: "ACTIVE",
        expenseDate: { gte: startOfToday },
      },
      select: { amount: true },
    });
    const todayTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    for (const exp of activeExpenses) {
      const catName = exp.expensecategory?.name || "Uncategorized";
      categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(exp.amount);
    }

    return NextResponse.json({
      success: true,
      data: expenses.map((e) => ({
        id: e.id,
        expenseNo: e.expenseNo,
        description: e.description,
        amount: Number(e.amount),
        expenseDate: e.expenseDate.toISOString(),
        status: e.status,
        category: e.expensecategory,
        createdBy: e.user,
        paymentMethod: e.paymentmethod,
      })),
      summary: {
        totalFiltered,
        monthlyTotal,
        todayTotal,
        count: expenses.length,
        categoryTotals,
      },
    });
  } catch (error) {
    console.error("GET EXPENSES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load expenses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { categoryId, description, amount, expenseDate, paymentMethodId } = body;

    if (!categoryId) {
      return NextResponse.json(
        { success: false, message: "Please select an expense category" },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { success: false, message: "Description is required" },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid amount greater than 0" },
        { status: 400 }
      );
    }

    const expenseNo = await generateExpenseNo();

    const created = await prisma.expense.create({
      data: {
        expenseNo,
        categoryId: parseInt(categoryId, 10),
        createdById: session.user.id,
        description: description.trim(),
        amount: parsedAmount,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paymentMethodId: paymentMethodId ? parseInt(paymentMethodId, 10) : null,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
      include: {
        expensecategory: true,
        paymentmethod: true,
      },
    });

    // Create Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entity: "EXPENSE",
          entityId: String(created.id),
          details: `Created expense ${created.expenseNo} of Rs. ${parsedAmount.toFixed(2)} (${created.expensecategory.name})`,
        },
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Expense recorded successfully",
      data: created,
    });
  } catch (error) {
    console.error("CREATE EXPENSE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to record expense" },
      { status: 500 }
    );
  }
}

