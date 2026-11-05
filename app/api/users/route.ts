import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const roleId = searchParams.get("roleId");
    const status = searchParams.get("status");

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { fullName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (roleId && roleId !== "ALL") {
      where.roleId = parseInt(roleId, 10);
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    const [users, roles] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { id: "asc" },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          status: true,
          roleId: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: { id: true, name: true, description: true },
          },
          _count: {
            select: { sale: true, job_job_createdByIdTouser: true },
          },
        },
      }),
      prisma.role.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, description: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        status: u.status,
        roleId: u.roleId,
        role: u.role,
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
        salesCount: u._count.sale,
        jobsCount: u._count.job_job_createdByIdTouser,
      })),
      roles,
    });
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load users" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { username, fullName, email, password, roleId, status } = body;

    if (!username || !username.trim()) {
      return NextResponse.json({ success: false, message: "Username is required" }, { status: 400 });
    }

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ success: false, message: "Full Name is required" }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (!roleId) {
      return NextResponse.json({ success: false, message: "Role is required" }, { status: 400 });
    }

    // Check unique username
    const existingUser = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Username already taken" },
        { status: 400 }
      );
    }

    // Check unique email if provided
    if (email && email.trim()) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: email.trim() },
      });
      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: "Email already registered" },
          { status: 400 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        fullName: fullName.trim(),
        email: email?.trim() ? email.trim().toLowerCase() : null,
        passwordHash,
        roleId: parseInt(roleId, 10),
        status: status || "ACTIVE",
        updatedAt: new Date(),
      },
      include: {
        role: true,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entity: "USER",
          entityId: String(newUser.id),
          details: `Created new user ${newUser.username} (${newUser.fullName}) with role ${newUser.role.name}`,
        },
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "User account created successfully",
      data: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (error) {
    console.error("CREATE USER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create user account" },
      { status: 500 }
    );
  }
}

