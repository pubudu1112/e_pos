import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

const VALID_STATUSES = [
  "NEW",
  "DESIGNING",
  "WAITING_APPROVAL",
  "APPROVED",
  "PRINTING",
  "FINISHING",
  "READY",
  "DELIVERED",
  "CANCELLED",
] as const;

// POST - Change status of job
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
    const newStatus = body.status;
    const note = typeof body.note === "string" ? body.note.trim() : `Status changed to ${newStatus}`;

    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json({ success: false, message: "Invalid status value" }, { status: 400 });
    }

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 });
    }

    const completedDate =
      newStatus === "DELIVERED" || newStatus === "READY"
        ? new Date()
        : job.completedDate;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id },
        data: {
          status: newStatus,
          completedDate,
          updatedAt: new Date(),
        },
      });

      await tx.jobstatushistory.create({
        data: {
          jobId: id,
          status: newStatus,
          note,
          createdById: session.user.id,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: `Job ${job.jobNo} updated to ${newStatus}`,
      data: result,
    });
  } catch (error) {
    console.error("UPDATE JOB STATUS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update job status" },
      { status: 500 }
    );
  }
}

