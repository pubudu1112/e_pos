import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// ============================================================
// POST - Create Warranty Claim
// ============================================================

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const allowed =
      (await hasPermission("POS_VIEW")) ||
      session.user.role.name === "SUPER_ADMIN" ||
      session.user.role.name === "ADMIN";

    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Permission denied." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const warrantyId = Number(body.warrantyId);
    const issue = typeof body.issue === "string" ? body.issue.trim() : "";
    const actionTaken =
      typeof body.actionTaken === "string" ? body.actionTaken.trim() : null;
    const status =
      typeof body.status === "string" ? body.status.toUpperCase() : "PENDING";

    if (Number.isNaN(warrantyId) || warrantyId <= 0) {
      return NextResponse.json(
        { success: false, message: "Valid warranty ID is required." },
        { status: 400 }
      );
    }

    if (!issue) {
      return NextResponse.json(
        { success: false, message: "Customer issue / defect description is required." },
        { status: 400 }
      );
    }

    const warranty = await prisma.warranty.findUnique({
      where: { id: warrantyId },
      include: { product: true },
    });

    if (!warranty) {
      return NextResponse.json(
        { success: false, message: "Warranty record not found." },
        { status: 404 }
      );
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const claimNo = `CLM-${year}${month}-${randCode}`;

    const validStatuses = [
      "PENDING",
      "IN_PROGRESS",
      "REPLACED",
      "REPAIRED",
      "REJECTED",
      "RESOLVED",
    ];
    const claimStatus = validStatuses.includes(status) ? (status as any) : "PENDING";
    const isResolved = ["REPLACED", "REPAIRED", "RESOLVED"].includes(claimStatus);

    const claim = await prisma.warrantyClaim.create({
      data: {
        claimNo,
        warrantyId,
        issue,
        actionTaken,
        status: claimStatus,
        handledById: session.user.id,
        claimDate: now,
        resolvedDate: isResolved ? now : null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Update warranty status to CLAIMED if replaced/repaired
    if (isResolved) {
      await prisma.warranty.update({
        where: { id: warrantyId },
        data: {
          status: "CLAIMED",
          updatedAt: now,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Warranty claim ${claimNo} recorded successfully.`,
      data: {
        id: claim.id,
        claimNo: claim.claimNo,
        warrantyId: claim.warrantyId,
        issue: claim.issue,
        actionTaken: claim.actionTaken,
        status: claim.status,
        claimDate: claim.claimDate.toISOString(),
        resolvedDate: claim.resolvedDate?.toISOString() || null,
        handledBy: claim.user?.fullName || session.user.fullName || session.user.username,
      },
    });
  } catch (error) {
    console.error("CREATE WARRANTY CLAIM ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Unable to record warranty claim." },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - Update / Resolve Warranty Claim
// ============================================================

export async function PUT(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const id = Number(body.id);
    const issue = typeof body.issue === "string" ? body.issue.trim() : undefined;
    const actionTaken =
      typeof body.actionTaken === "string" ? body.actionTaken.trim() : undefined;
    const status =
      typeof body.status === "string" ? body.status.toUpperCase() : undefined;

    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "Valid claim ID is required." },
        { status: 400 }
      );
    }

    const existingClaim = await prisma.warrantyClaim.findUnique({
      where: { id },
    });

    if (!existingClaim) {
      return NextResponse.json(
        { success: false, message: "Claim not found." },
        { status: 404 }
      );
    }

    const validStatuses = [
      "PENDING",
      "IN_PROGRESS",
      "REPLACED",
      "REPAIRED",
      "REJECTED",
      "RESOLVED",
    ];
    const updateStatus =
      status && validStatuses.includes(status) ? (status as any) : undefined;
    const isResolved =
      updateStatus && ["REPLACED", "REPAIRED", "RESOLVED"].includes(updateStatus);

    const now = new Date();

    const updated = await prisma.warrantyClaim.update({
      where: { id },
      data: {
        ...(issue !== undefined ? { issue } : {}),
        ...(actionTaken !== undefined ? { actionTaken } : {}),
        ...(updateStatus !== undefined ? { status: updateStatus } : {}),
        ...(isResolved ? { resolvedDate: now } : {}),
        handledById: session.user.id,
        updatedAt: now,
      },
    });

    if (isResolved) {
      await prisma.warranty.update({
        where: { id: existingClaim.warrantyId },
        data: {
          status: "CLAIMED",
          updatedAt: now,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Warranty claim updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("UPDATE WARRANTY CLAIM ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update claim." },
      { status: 500 }
    );
  }
}
