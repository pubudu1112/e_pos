import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// POST - Record payment towards a job
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const allowed = await hasPermission("JOB_UPDATE");
    if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, message: "Permission denied" }, { status: 403 });
    }

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, message: "Invalid job ID" }, { status: 400 });
    }

    const body = await request.json();
    const amount = Number(body.amount);
    const reference = typeof body.reference === "string" ? body.reference.trim() : null;
    const note = typeof body.note === "string" ? body.note.trim() : "Payment received";

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: "Payment amount must be greater than zero." }, { status: 400 });
    }

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 });
    }

    const currentTotal = Number(job.total);
    const currentAdvance = Number(job.advanceAmount);
    const newAdvance = currentAdvance + amount;
    const newBalance = Math.max(0, currentTotal - newAdvance);

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.jobpayment.create({
        data: {
          jobId: id,
          amount,
          reference,
          note,
          paymentDate: new Date(),
        },
      });

      const updatedJob = await tx.job.update({
        where: { id },
        data: {
          advanceAmount: newAdvance,
          balanceAmount: newBalance,
          updatedAt: new Date(),
        },
      });

      return { payment, job: updatedJob };
    });

    return NextResponse.json({
      success: true,
      message: `Payment of Rs. ${amount.toFixed(2)} recorded successfully`,
      data: result,
    });
  } catch (error) {
    console.error("RECORD JOB PAYMENT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to record payment" },
      { status: 500 }
    );
  }
}

