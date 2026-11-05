import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, message: "Invalid expense ID" }, { status: 400 });
    }

    const body = await req.json();
    const { categoryId, description, amount, expenseDate, paymentMethodId, status } = body;

    const existing = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: "Expense not found" }, { status: 404 });
    }

    const data: any = { updatedAt: new Date() };

    if (categoryId) data.categoryId = parseInt(categoryId, 10);
    if (description !== undefined) data.description = description.trim();
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 });
      }
      data.amount = parsedAmount;
    }
    if (expenseDate) data.expenseDate = new Date(expenseDate);
    if (paymentMethodId !== undefined) {
      data.paymentMethodId = paymentMethodId ? parseInt(paymentMethodId, 10) : null;
    }
    if (status && (status === "ACTIVE" || status === "CANCELLED")) {
      data.status = status;
    }

    const updated = await prisma.expense.update({
      where: { id },
      data,
      include: {
        expensecategory: true,
        paymentmethod: true,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE",
          entity: "EXPENSE",
          entityId: String(id),
          details: `Updated expense ${updated.expenseNo}`,
        },
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Expense updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("UPDATE EXPENSE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update expense" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, message: "Invalid expense ID" }, { status: 400 });
    }

    const existing = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: "Expense not found" }, { status: 404 });
    }

    // Cancel or delete
    await prisma.expense.delete({
      where: { id },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE",
          entity: "EXPENSE",
          entityId: String(id),
          details: `Deleted expense ${existing.expenseNo} (Rs. ${existing.amount})`,
        },
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("DELETE EXPENSE ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete expense" },
      { status: 500 }
    );
  }
}

