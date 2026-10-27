import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../lib/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const password = process.env.ADMIN_PASSWORD || "pubuduPS@97";

  const passwordHash = await bcrypt.hash(password, 12);

  const role = await prisma.role.upsert({
    where: {
      name: "SUPER_ADMIN",
    },

    update: {},

    create: {
      name: "SUPER_ADMIN",
      description: "Full system administrator",
      isActive: true,
      updatedAt: new Date(),
    },
  });

  const user = await prisma.user.upsert({
    where: {
      username: "admin",
    },

    update: {
      passwordHash,
      fullName: "System Administrator",
      status: "ACTIVE",
      roleId: role.id,
      updatedAt: new Date(),
    },

    create: {
      username: "admin",
      fullName: "System Administrator",
      passwordHash,
      status: "ACTIVE",
      roleId: role.id,
      updatedAt: new Date(),
    },
  });

  const ALL_PERMISSIONS = [
    "DASHBOARD_VIEW",
    "POS_VIEW",
    "JOB_VIEW",
    "JOB_CREATE",
    "JOB_UPDATE",
    "PRODUCT_VIEW",
    "PRODUCT_CREATE",
    "PRODUCT_UPDATE",
    "PRODUCT_DELETE",
    "CATEGORY_VIEW",
    "CATEGORY_CREATE",
    "CATEGORY_UPDATE",
    "CATEGORY_DELETE",
    "BRAND_VIEW",
    "BRAND_CREATE",
    "BRAND_UPDATE",
    "BRAND_DELETE",
    "UNIT_VIEW",
    "UNIT_CREATE",
    "UNIT_UPDATE",
    "UNIT_DELETE",
    "TAX_VIEW",
    "TAX_CREATE",
    "TAX_UPDATE",
    "TAX_DELETE",
    "SERVICE_VIEW",
    "SERVICE_CREATE",
    "SERVICE_UPDATE",
    "SERVICE_DELETE",
    "SERVICE_CATEGORY_VIEW",
    "SERVICE_CATEGORY_CREATE",
    "SERVICE_CATEGORY_UPDATE",
    "SERVICE_CATEGORY_DELETE",
    "INVENTORY_VIEW",
    "INVENTORY_VIEW_MOVEMENTS",
    "PURCHASE_VIEW",
    "PURCHASE_CREATE",
    "PURCHASE_UPDATE",
    "SALE_VIEW",
    "SALE_CREATE",
    "CUSTOMER_VIEW",
    "CUSTOMER_CREATE",
    "CUSTOMER_UPDATE",
    "CUSTOMER_DELETE",
    "SUPPLIER_VIEW",
    "SUPPLIER_CREATE",
    "SUPPLIER_UPDATE",
    "SUPPLIER_DELETE",
    "EXPENSE_VIEW",
    "EXPENSE_CREATE",
    "EXPENSE_UPDATE",
    "EXPENSE_DELETE",
    "REPORT_SALES_VIEW",
    "REPORT_FINANCIAL_VIEW",
    "REPORT_ACTIVITY_VIEW",
    "SETTINGS_VIEW",
    "USER_VIEW",
    "USER_CREATE",
    "USER_UPDATE",
    "USER_DELETE",
    "ROLE_VIEW",
    "ROLE_CREATE",
    "ROLE_UPDATE",
    "ROLE_DELETE",
  ];

  for (const code of ALL_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: code
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" "),
        description: `Access to ${code.toLowerCase().replace(/_/g, " ")}`,
      },
    });

    await prisma.rolepermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: perm.id,
      },
    });
  }

  console.log("Admin user and permissions created successfully.");
  console.log("Username:", user.username);
  console.log("Password:", password);
  console.log("Role:", role.name);
  console.log(`Seeded ${ALL_PERMISSIONS.length} permissions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });