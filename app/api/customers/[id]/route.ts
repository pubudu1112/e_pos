
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// ============================================================
// HELPER: SAFE DATE FORMAT
// ============================================================

function safeDate(value: Date | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

// ============================================================
// GET - SINGLE CUSTOMER DETAILS
// Includes sales, jobs, transactions and credit information
// ============================================================

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Check session
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Validate customer ID
    const { id: rawId } = await params;
    const id = Number(rawId);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid customer ID" },
        { status: 400 }
      );
    }

    // 3. Get customer details
    const customer = await prisma.customer.findUnique({
      where: { id },

      include: {
        sale: {
          take: 10,
          orderBy: { saleDate: "desc" },
          select: {
            id: true,
            invoiceNo: true,
            saleDate: true,
            total: true,
            paidAmount: true,
            balanceAmount: true,
            paymentStatus: true,
            status: true,
          },
        },

        job: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            jobNo: true,
            title: true,
            status: true,
            priority: true,
            total: true,
            advanceAmount: true,
            balanceAmount: true,
            createdAt: true,
          },
        },

        customertransaction: {
          take: 20,
          orderBy: { createdAt: "desc" },
        },

        _count: {
          select: {
            sale: true,
            job: true,
          },
        },
      },
    });

    // 4. Check customer exists
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    // ========================================================
    // 5. CALCULATE CUSTOMER OUTSTANDING BALANCE
    // ========================================================

    // Calculate ALL outstanding completed sales.
    // Do not use only the latest 10 sales from customer.sale.

    const salesBalance = await prisma.sale.aggregate({
      where: {
        customerId: id,
        status: "COMPLETED",
        balanceAmount: {
          gt: 0,
        },
      },

      _sum: {
        balanceAmount: true,
      },
    });

    const openingBalance = Number(
      customer.openingBalance || 0
    );

    const outstandingSales = Number(
      salesBalance._sum.balanceAmount || 0
    );

    // Total customer outstanding
    const balanceDue =
      openingBalance + outstandingSales;

    // ========================================================
    // 6. CREDIT LIMIT CALCULATION
    // ========================================================

    const creditLimit = Number(
      customer.creditLimit || 0
    );

    // Remaining available credit
    const availableCredit =
      creditLimit - balanceDue;

    // Credit utilization percentage
    const creditUtilization =
      creditLimit > 0
        ? (balanceDue / creditLimit) * 100
        : 0;

    // Credit limit exceeded
    const isCreditLimitExceeded =
      balanceDue > creditLimit && creditLimit > 0;

    // ========================================================
    // 7. RETURN CUSTOMER DETAILS
    // ========================================================

    return NextResponse.json({
      success: true,

      data: {
        id: customer.id,
        code: customer.code,
        name: customer.name,

        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",

        // Customer financial information
        creditLimit,
        openingBalance,
        outstandingSales,
        balanceDue,
        availableCredit,
        creditUtilization,
        isCreditLimitExceeded,

        isActive: customer.isActive,

        // Customer dates
        createdAt: safeDate(customer.createdAt),
        updatedAt: safeDate(customer.updatedAt),

        // Customer statistics
        lifetimeSales: customer._count.sale,
        totalJobs: customer._count.job,

        // Recent sales
        sales: customer.sale.map((s) => ({
          id: s.id,
          invoiceNo: s.invoiceNo,
          saleDate: safeDate(s.saleDate),

          total: Number(s.total),
          paidAmount: Number(s.paidAmount),
          balanceAmount: Number(s.balanceAmount),

          paymentStatus: s.paymentStatus,
          status: s.status,
        })),

        // Recent jobs
        jobs: customer.job.map((j) => ({
          id: j.id,
          jobNo: j.jobNo,
          title: j.title,

          status: j.status,
          priority: j.priority,

          total: Number(j.total),
          advanceAmount: Number(j.advanceAmount),
          balanceAmount: Number(j.balanceAmount),

          createdAt: safeDate(j.createdAt),
        })),

        // Customer transaction history
        transactions: customer.customertransaction.map((t) => ({
          id: Number(t.id),
          description: t.description || "",

          debit: Number(t.debit),
          credit: Number(t.credit),

          createdAt: safeDate(t.createdAt),
        })),
      },
    });

  } catch (error) {
    console.error("GET CUSTOMER DETAILS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch customer details",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - UPDATE CUSTOMER
// ============================================================

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const allowed = await hasPermission("CUSTOMER_UPDATE");

    if (
      !allowed &&
      session.user.role.name !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { success: false, message: "Permission denied" },
        { status: 403 }
      );
    }

    const { id: rawId } = await params;
    const id = Number(rawId);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid customer ID" },
        { status: 400 }
      );
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : undefined;

    if (name !== undefined && !name) {
      return NextResponse.json(
        { success: false, message: "Customer name is required" },
        { status: 400 }
      );
    }

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim() || null
        : undefined;

    const email =
      typeof body.email === "string"
        ? body.email.trim() || null
        : undefined;

    const address =
      typeof body.address === "string"
        ? body.address.trim() || null
        : undefined;

    const creditLimit =
      body.creditLimit !== undefined
        ? Math.max(0, Number(body.creditLimit) || 0)
        : undefined;

    const openingBalance =
      body.openingBalance !== undefined
        ? Number(body.openingBalance) || 0
        : undefined;

    const isActive =
      body.isActive !== undefined
        ? Boolean(body.isActive)
        : undefined;

    const updated = await prisma.customer.update({
      where: { id },

      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(address !== undefined ? { address } : {}),

        ...(creditLimit !== undefined
          ? { creditLimit }
          : {}),

        ...(openingBalance !== undefined
          ? { openingBalance }
          : {}),

        ...(isActive !== undefined
          ? { isActive }
          : {}),

        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully",

      data: {
        ...updated,
        creditLimit: Number(updated.creditLimit),
        openingBalance: Number(updated.openingBalance),
        createdAt: safeDate(updated.createdAt),
        updatedAt: safeDate(updated.updatedAt),
      },
    });

  } catch (error) {
    console.error("UPDATE CUSTOMER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update customer",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE - DELETE OR DEACTIVATE CUSTOMER
// ============================================================

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const allowed = await hasPermission("CUSTOMER_DELETE");

    if (
      !allowed &&
      session.user.role.name !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { success: false, message: "Permission denied" },
        { status: 403 }
      );
    }

    const { id: rawId } = await params;
    const id = Number(rawId);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid customer ID" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    // Check linked sales and jobs
    const [salesCount, jobsCount] = await Promise.all([
      prisma.sale.count({
        where: { customerId: id },
      }),

      prisma.job.count({
        where: { customerId: id },
      }),
    ]);

    if (salesCount > 0 || jobsCount > 0) {
      // Preserve financial history
      await prisma.customer.update({
        where: { id },

        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message:
          "Customer has linked transactions and was deactivated instead of deleted.",
      });
    }

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Customer deleted successfully",
    });

  } catch (error) {
    console.error("DELETE CUSTOMER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete customer",
      },
      { status: 500 }
    );
  }
}
