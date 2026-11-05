import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

function generateJobNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `JOB-${year}${month}-${random}`;
}

// GET - List jobs with search, filters & statistics
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "all";
    const priority = searchParams.get("priority") || "all";
    const customerId = searchParams.get("customerId");

    const where: any = {};

    if (status !== "all") {
      where.status = status;
    }

    if (priority !== "all") {
      where.priority = priority;
    }

    if (customerId) {
      where.customerId = Number(customerId);
    }

    if (search) {
      where.OR = [
        { jobNo: { contains: search } },
        { title: { contains: search } },
        { description: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const [jobs, totalCount, statusCounts, users, customers, services] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { id: true, name: true, phone: true, code: true },
          },
          user_job_createdByIdTouser: {
            select: { id: true, fullName: true, username: true },
          },
          user_job_assignedToIdTouser: {
            select: { id: true, fullName: true, username: true },
          },
          jobitem: true,
          jobpayment: {
            orderBy: { paymentDate: "desc" },
          },
        },
      }),
      prisma.job.count(),
      prisma.job.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.user.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, fullName: true, username: true },
        orderBy: { fullName: "asc" },
      }),
      prisma.customer.findMany({
        where: { isActive: true },
        select: { id: true, name: true, phone: true, code: true },
        orderBy: { name: "asc" },
      }),
      prisma.service.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, code: true, basePrice: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of statusCounts) {
      statusMap[s.status] = s._count.id;
    }

    return NextResponse.json({
      success: true,
      data: jobs.map((j) => ({
        id: j.id,
        jobNo: j.jobNo,
        title: j.title,
        description: j.description || "",
        status: j.status,
        priority: j.priority,
        startDate: j.startDate,
        dueDate: j.dueDate,
        completedDate: j.completedDate,
        total: Number(j.total),
        advanceAmount: Number(j.advanceAmount),
        balanceAmount: Number(j.balanceAmount),
        createdAt: j.createdAt,
        customer: j.customer,
        createdBy: j.user_job_createdByIdTouser,
        assignedTo: j.user_job_assignedToIdTouser,
        itemsCount: j.jobitem.length,
        items: j.jobitem.map((it) => ({
          id: it.id,
          description: it.description || "",
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          total: Number(it.total),
        })),
        payments: j.jobpayment.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          paymentDate: p.paymentDate,
          reference: p.reference || "",
          note: p.note || "",
        })),
      })),
      stats: {
        total: totalCount,
        new: statusMap["NEW"] || 0,
        inProgress:
          (statusMap["DESIGNING"] || 0) +
          (statusMap["PRINTING"] || 0) +
          (statusMap["FINISHING"] || 0) +
          (statusMap["APPROVED"] || 0),
        ready: statusMap["READY"] || 0,
        delivered: statusMap["DELIVERED"] || 0,
        cancelled: statusMap["CANCELLED"] || 0,
      },
      dropdowns: {
        users,
        customers,
        services: services.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          basePrice: Number(s.basePrice),
        })),
      },
    });
  } catch (error) {
    console.error("GET JOBS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

// POST - Create a new Job
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const allowed = await hasPermission("JOB_CREATE");
    if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, message: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const customerId = body.customerId ? Number(body.customerId) : null;
    const priority = body.priority || "NORMAL";
    const assignedToId = body.assignedToId ? Number(body.assignedToId) : null;
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;
    const startDate = body.startDate ? new Date(body.startDate) : new Date();

    if (!title) {
      return NextResponse.json({ success: false, message: "Job title is required." }, { status: 400 });
    }

    const items: Array<{
      serviceId?: number | null;
      description: string;
      quantity: number;
      unitPrice: number;
    }> = Array.isArray(body.items) ? body.items : [];

    // Calculate total from items
    let calculatedTotal = 0;
    const validItems = items.map((it) => {
      const q = Math.max(1, Number(it.quantity) || 1);
      const p = Math.max(0, Number(it.unitPrice) || 0);
      const itemTotal = q * p;
      calculatedTotal += itemTotal;
      return {
        serviceId: it.serviceId ? Number(it.serviceId) : null,
        description: it.description || title,
        quantity: q,
        unitPrice: p,
        total: itemTotal,
      };
    });

    const total = Math.max(calculatedTotal, Number(body.total) || 0);
    const advanceAmount = Math.max(0, Number(body.advanceAmount) || 0);
    const balanceAmount = Math.max(0, total - advanceAmount);

    const jobNo = generateJobNo();

    const result = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          jobNo,
          customerId,
          title,
          description,
          status: "NEW",
          priority,
          startDate,
          dueDate,
          total,
          advanceAmount,
          balanceAmount,
          createdById: session.user.id,
          assignedToId,
          updatedAt: new Date(),
        },
      });

      // Insert job items if any
      if (validItems.length > 0) {
        for (const item of validItems) {
          await tx.jobitem.create({
            data: {
              jobId: newJob.id,
              serviceId: item.serviceId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            },
          });
        }
      }

      // Record initial advance payment if provided
      if (advanceAmount > 0) {
        await tx.jobpayment.create({
          data: {
            jobId: newJob.id,
            amount: advanceAmount,
            reference: body.paymentReference || "ADVANCE-PAYMENT",
            note: body.paymentNote || "Advance deposit for order",
          },
        });
      }

      // Log initial status history
      await tx.jobstatushistory.create({
        data: {
          jobId: newJob.id,
          status: "NEW",
          note: "Job created in system",
          createdById: session.user.id,
        },
      });

      return newJob;
    });

    return NextResponse.json({
      success: true,
      message: `Job ${jobNo} created successfully`,
      data: result,
    });
  } catch (error) {
    console.error("CREATE JOB ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create job" },
      { status: 500 }
    );
  }
}

