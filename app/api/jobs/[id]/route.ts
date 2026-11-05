import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// GET - Get single job with items, payments, status history & customer
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, message: "Invalid job ID" }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        customer: true,
        user_job_createdByIdTouser: {
          select: { id: true, fullName: true, username: true },
        },
        user_job_assignedToIdTouser: {
          select: { id: true, fullName: true, username: true },
        },
        jobitem: {
          include: {
            service: true,
          },
        },
        jobpayment: {
          orderBy: { paymentDate: "desc" },
        },
        jobstatushistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        jobNo: job.jobNo,
        title: job.title,
        description: job.description || "",
        status: job.status,
        priority: job.priority,
        startDate: job.startDate,
        dueDate: job.dueDate,
        completedDate: job.completedDate,
        total: Number(job.total),
        advanceAmount: Number(job.advanceAmount),
        balanceAmount: Number(job.balanceAmount),
        createdAt: job.createdAt,
        customer: job.customer,
        createdBy: job.user_job_createdByIdTouser,
        assignedTo: job.user_job_assignedToIdTouser,
        items: job.jobitem.map((it) => ({
          id: it.id,
          description: it.description || "",
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          total: Number(it.total),
          service: it.service,
        })),
        payments: job.jobpayment.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          paymentDate: p.paymentDate,
          reference: p.reference || "",
          note: p.note || "",
        })),
        history: job.jobstatushistory.map((h) => ({
          id: Number(h.id),
          status: h.status,
          note: h.note || "",
          createdAt: h.createdAt,
          createdById: h.createdById,
        })),
      },
    });
  } catch (error) {
    console.error("GET JOB DETAILS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch job details" },
      { status: 500 }
    );
  }
}

// PUT - Update job details
export async function PUT(
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
    const title = typeof body.title === "string" ? body.title.trim() : undefined;
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const customerId = body.customerId ? Number(body.customerId) : null;
    const priority = body.priority;
    const assignedToId = body.assignedToId ? Number(body.assignedToId) : null;
    const dueDate = body.dueDate ? new Date(body.dueDate) : undefined;
    const startDate = body.startDate ? new Date(body.startDate) : undefined;

    const updated = await prisma.job.update({
      where: { id },
      data: {
        ...(title ? { title } : {}),
        description,
        customerId,
        ...(priority ? { priority } : {}),
        assignedToId,
        ...(dueDate !== undefined ? { dueDate } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Job updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("UPDATE JOB ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update job" },
      { status: 500 }
    );
  }
}

// DELETE - Delete or cancel job
export async function DELETE(
  _request: Request,
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

    // Cancel job
    await prisma.job.update({
      where: { id },
      data: { status: "CANCELLED", updatedAt: new Date() },
    });

    await prisma.jobstatushistory.create({
      data: {
        jobId: id,
        status: "CANCELLED",
        note: "Job cancelled by user",
        createdById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Job cancelled successfully",
    });
  } catch (error) {
    console.error("DELETE JOB ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to cancel job" },
      { status: 500 }
    );
  }
}

