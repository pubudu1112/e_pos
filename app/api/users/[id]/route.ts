import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function GET(
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
      return NextResponse.json({ success: false, message: "Invalid user ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        status: true,
        roleId: true,
        lastLoginAt: true,
        createdAt: true,
        role: {
          select: { id: true, name: true, description: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("GET USER BY ID ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load user" },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json({ success: false, message: "Invalid user ID" }, { status: 400 });
    }

    const body = await req.json();
    const { fullName, email, roleId, status, newPassword } = body;

    const existing = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Protection: Prevent demoting or deactivating the logged-in super admin if they are the only super admin
    if (existing.role.name === "SUPER_ADMIN" && (status === "INACTIVE" || (roleId && parseInt(roleId, 10) !== existing.roleId))) {
      const superAdminCount = await prisma.user.count({
        where: { role: { name: "SUPER_ADMIN" }, status: "ACTIVE" },
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { success: false, message: "Cannot deactivate or change role of the last active Super Admin" },
          { status: 400 }
        );
      }
    }

    const data: any = { updatedAt: new Date() };

    if (fullName !== undefined) data.fullName = fullName.trim();
    if (email !== undefined) data.email = email?.trim() ? email.trim().toLowerCase() : null;
    if (roleId !== undefined) data.roleId = parseInt(roleId, 10);
    if (status !== undefined) data.status = status;

    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return NextResponse.json(
          { success: false, message: "New password must be at least 6 characters" },
          { status: 400 }
        );
      }
      data.passwordHash = await bcrypt.hash(newPassword.trim(), 12);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE",
          entity: "USER",
          entityId: String(id),
          details: `Updated user profile for ${updated.username} (${updated.fullName})`,
        },
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "User account updated successfully",
      data: {
        id: updated.id,
        username: updated.username,
        fullName: updated.fullName,
        email: updated.email,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error("UPDATE USER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update user" },
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
      return NextResponse.json({ success: false, message: "Invalid user ID" }, { status: 400 });
    }

    if (session.user.id === id) {
      return NextResponse.json(
        { success: false, message: "You cannot delete or deactivate your own active session account" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    if (existing.role.name === "SUPER_ADMIN") {
      const superAdminCount = await prisma.user.count({
        where: { role: { name: "SUPER_ADMIN" }, status: "ACTIVE" },
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { success: false, message: "Cannot deactivate the last remaining Super Admin" },
          { status: 400 }
        );
      }
    }

    // Safely deactivate user
    await prisma.user.update({
      where: { id },
      data: { status: "INACTIVE", updatedAt: new Date() },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE",
          entity: "USER",
          entityId: String(id),
          details: `Deactivated user account ${existing.username} (${existing.fullName})`,
        },
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to deactivate user" },
      { status: 500 }
    );
  }
}

