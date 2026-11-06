import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// ============================================================
// GET - Query Warranties & Claims
// Permission: POS_VIEW or SUPER_ADMIN
// ============================================================

export async function GET(request: Request) {
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
        { success: false, message: "You do not have permission to view warranties." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim().toUpperCase() || "ALL";

    // Build Prisma search condition
    const searchWhere = search
      ? {
          OR: [
            { warrantyCode: { contains: search } },
            { customerName: { contains: search } },
            { customerPhone: { contains: search } },
            { sale: { invoiceNo: { contains: search } } },
            { product: { name: { contains: search } } },
            { product: { code: { contains: search } } },
          ],
        }
      : {};

    const statusWhere =
      statusFilter !== "ALL" &&
      ["ACTIVE", "EXPIRED", "CLAIMED", "VOID"].includes(statusFilter)
        ? { status: statusFilter as any }
        : {};

    const warranties = await prisma.warranty.findMany({
      where: {
        AND: [searchWhere, statusWhere],
      },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            sellingPrice: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            unit: {
              select: {
                shortName: true,
              },
            },
          },
        },
        sale: {
          select: {
            id: true,
            invoiceNo: true,
            createdAt: true,
            paymentStatus: true,
            total: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        claims: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const now = new Date();

    // Auto-sync expired status and compute days remaining
    const enriched = warranties.map((w) => {
      const isPastExpiry = new Date(w.expiryDate) < now;
      let effectiveStatus = w.status;

      if (effectiveStatus === "ACTIVE" && isPastExpiry) {
        effectiveStatus = "EXPIRED";
      }

      const diffTime = new Date(w.expiryDate).getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: w.id,
        warrantyCode: w.warrantyCode,
        saleId: w.saleId,
        productId: w.productId,
        customerId: w.customerId,
        customerName: w.customerName || w.customer?.name || "Walk-in Customer",
        customerPhone: w.customerPhone || w.customer?.phone || null,
        startDate: w.startDate.toISOString(),
        durationMonths: w.durationMonths,
        expiryDate: w.expiryDate.toISOString(),
        status: effectiveStatus,
        notes: w.notes,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
        diffDays,
        product: w.product
          ? {
              ...w.product,
              sellingPrice: Number(w.product.sellingPrice),
            }
          : null,
        sale: w.sale
          ? {
              ...w.sale,
              total: Number(w.sale.total),
              createdAt: w.sale.createdAt.toISOString(),
            }
          : null,
        customer: w.customer,
        claims: w.claims.map((c) => ({
          id: c.id,
          claimNo: c.claimNo,
          warrantyId: c.warrantyId,
          issue: c.issue,
          actionTaken: c.actionTaken,
          status: c.status,
          claimDate: c.claimDate.toISOString(),
          resolvedDate: c.resolvedDate?.toISOString() || null,
          handledBy: c.user?.fullName || null,
        })),
      };
    });

    // Compute KPI Stats
    const totalWarranties = await prisma.warranty.count();
    const activeCount = await prisma.warranty.count({
      where: {
        status: "ACTIVE",
        expiryDate: { gte: now },
      },
    });
    const expiredCount = await prisma.warranty.count({
      where: {
        OR: [
          { status: "EXPIRED" },
          {
            status: "ACTIVE",
            expiryDate: { lt: now },
          },
        ],
      },
    });
    const claimedCount = await prisma.warranty.count({
      where: { status: "CLAIMED" },
    });
    const pendingClaims = await prisma.warrantyClaim.count({
      where: {
        status: {
          in: ["PENDING", "IN_PROGRESS"],
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: enriched,
      stats: {
        totalWarranties,
        activeWarranties: activeCount,
        expiredWarranties: expiredCount,
        claimedWarranties: claimedCount,
        pendingClaims,
      },
    });
  } catch (error) {
    console.error("GET WARRANTIES ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load warranties." },
      { status: 500 }
    );
  }
}
