import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

// GET - Get single customer with sales, jobs and transaction history
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
      return NextResponse.json({ success: false, message: "Invalid customer ID" }, { status: 400 });
    }

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
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        code: customer.code,
        name: customer.name,
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        creditLimit: Number(customer.creditLimit),
        openingBalance: Number(customer.openingBalance),
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        sales: customer.sale.map((s) => ({
          ...s,
          total: Number(s.total),
          paidAmount: Number(s.paidAmount),
          balanceAmount: Number(s.balanceAmount),
        })),
        jobs: customer.job.map((j) => ({
          ...j,
          total: Number(j.total),
          advanceAmount: Number(j.advanceAmount),
          balanceAmount: Number(j.balanceAmount),
        })),
        transactions: customer.customertransaction.map((t) => ({
          id: Number(t.id),
          description: t.description || "",
          debit: Number(t.debit),
          credit: Number(t.credit),
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("GET CUSTOMER DETAILS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch customer details" },
      { status: 500 }
    );
  }
}

// PUT - Update customer
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const allowed = await hasPermission("CUSTOMER_UPDATE");
    if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, message: "Permission denied" }, { status: 403 });
    }

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, message: "Invalid customer ID" }, { status: 400 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;
    const email = typeof body.email === "string" ? body.email.trim() : null;
    const address = typeof body.address === "string" ? body.address.trim() : null;
    const creditLimit = body.creditLimit !== undefined ? Math.max(0, Number(body.creditLimit) || 0) : undefined;
    const openingBalance = body.openingBalance !== undefined ? Number(body.openingBalance) || 0 : undefined;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : undefined;

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        phone,
        email,
        address,
        ...(creditLimit !== undefined ? { creditLimit } : {}),
        ...(openingBalance !== undefined ? { openingBalance } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("UPDATE CUSTOMER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update customer" },
      { status: 500 }
    );
  }
}

// DELETE - Delete or deactivate customer
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const allowed = await hasPermission("CUSTOMER_DELETE");
    if (!allowed && session.user.role.name !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, message: "Permission denied" }, { status: 403 });
    }

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ success: false, message: "Invalid customer ID" }, { status: 400 });
    }

    // Check if customer has sales or jobs
    const [salesCount, jobsCount] = await Promise.all([
      prisma.sale.count({ where: { customerId: id } }),
      prisma.job.count({ where: { customerId: id } }),
    ]);

    if (salesCount > 0 || jobsCount > 0) {
      // Deactivate instead of hard delete to preserve financial history
      await prisma.customer.update({
        where: { id },
        data: { isActive: false, updatedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: "Customer has linked transactions and was deactivated instead of deleted.",
      });
    }

    await prisma.customer.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("DELETE CUSTOMER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete customer" },
      { status: 500 }
    );
  }
}

