
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth/authorize";

// GET - POS Products + Services + Database Categories
export async function GET(request: Request) {
  try {
    const auth = await authorize(["POS_VIEW", "POS_CREATE_SALE"]);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search")?.trim() || "").slice(0, 100);
    const rawPage = Number(searchParams.get("page") || 1);
    const page = Number.isSafeInteger(rawPage) ? Math.max(1, Math.min(rawPage, 10000)) : 1;
    const pageSize = 80;
    const categoryType = searchParams.get("categoryType");
    const rawCategoryId = Number(searchParams.get("categoryId"));
    const categoryId = Number.isInteger(rawCategoryId) && rawCategoryId > 0 ? rawCategoryId : null;
    const skip = (page - 1) * pageSize;
    const productWhere = {
      status: "ACTIVE" as const,
      ...(categoryType === "SERVICE" ? { id: -1 } : {}),
      ...(categoryType === "PRODUCT" && categoryId ? { categoryId } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }, { barcode: { contains: search } }, { category: { name: { contains: search } } }] } : {}),
    };
    const serviceWhere = {
      status: "ACTIVE" as const,
      ...(categoryType === "PRODUCT" ? { id: -1 } : {}),
      ...(categoryType === "SERVICE" && categoryId ? { categoryId } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { code: { contains: search } }, { servicecategory: { name: { contains: search } } }] } : {}),
    };

    // ---------------------------------------------------------
    // 1. Fetch Active Product Categories
    // ---------------------------------------------------------

    const [productCategories, serviceCategories, products, services] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, description: true },
      }),
      prisma.servicecategory.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, description: true },
      }),
      prisma.product.findMany({
        where: productWhere,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip,
        take: pageSize,
        include: { unit: true, category: true, brand: true, tax: true, stock: true },
      }),
      prisma.service.findMany({
        where: serviceWhere,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip,
        take: pageSize,
        include: { servicecategory: true, tax: true },
      }),
    ]);

    const [productTotal, serviceTotal, productCounts, serviceCounts] = await Promise.all([
      prisma.product.count({ where: productWhere }),
      prisma.service.count({ where: serviceWhere }),
      prisma.product.groupBy({
        by: ["categoryId"],
        where: { status: "ACTIVE" },
        _count: { _all: true },
      }),
      prisma.service.groupBy({
        by: ["categoryId"],
        where: { status: "ACTIVE" },
        _count: { _all: true },
      }),
    ]);

    // ---------------------------------------------------------
    // 5. Format Products
    // ---------------------------------------------------------

    const productData = products.map((product) => ({
      id: product.id,
      code: product.code,
      name: product.name,
      imageUrl: product.imageUrl || null,
      type: "PRODUCT" as const,
      price: Number(product.sellingPrice),
      unit: product.unit?.shortName || "",
      category: product.category?.name || "",
      categoryId: product.categoryId,
      categoryType: "PRODUCT" as const,
      brand: product.brand?.name || "",
      barcode: product.barcode || null,
      stock: product.stock
        ? Number(product.stock.quantity)
        : 0,
      minimumStock: Number(product.minimumStock),
      tax: product.tax
        ? {
            id: product.tax.id,
            name: product.tax.name,
            rate: Number(product.tax.rate),
          }
        : null,
      warrantyMonths: product.warrantyMonths
        ? Number(product.warrantyMonths)
        : 0,
        warrantyEnabled: product.category?.warrantyEnabled ?? false,
    }));

    // ---------------------------------------------------------
    // 6. Format Services
    // ---------------------------------------------------------

    const serviceData = services.map((service) => {
      return {
        id: service.id,
        code: service.code,
        name: service.name,
        imageUrl: null,
        type: "SERVICE" as const,
        price: Number(service.basePrice),
        unit: "Each",
        category: service.servicecategory?.name || "",
        categoryId: service.categoryId,
        categoryType: "SERVICE" as const,
        brand: "",
        barcode: null,
        stock: null,
        minimumStock: null,
        tax: service.tax
          ? {
              id: service.tax.id,
              name: service.tax.name,
              rate: Number(service.tax.rate),
            }
          : null,
      };
    });

    // ---------------------------------------------------------
    // 7. Category Counts
    // ---------------------------------------------------------

    const productCountByCategory = new Map(
      productCounts.map((entry) => [entry.categoryId, entry._count._all])
    );
    const serviceCountByCategory = new Map(
      serviceCounts.map((entry) => [entry.categoryId, entry._count._all])
    );

    const productCategoryData = productCategories.map((category) => ({
      ...category,
      type: "PRODUCT" as const,
      count: productCountByCategory.get(category.id) ?? 0,
    }));

    const serviceCategoryData = serviceCategories.map((category) => ({
      ...category,
      type: "SERVICE" as const,
      count: serviceCountByCategory.get(category.id) ?? 0,
    }));

    // ---------------------------------------------------------
    // 8. Combined POS Items
    // ---------------------------------------------------------

    const data = [...productData, ...serviceData].sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      data,
      categories: {
        products: productCategoryData,
        services: serviceCategoryData,
      },
      pagination: {
        page,
        pageSize,
        total: productTotal + serviceTotal,
        hasMore: productTotal > page * pageSize || serviceTotal > page * pageSize,
      },
    });
    
  } catch (error) {
    console.error("GET POS ITEMS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load POS products and services.",
      },
      { status: 500 }
    );
  }
}
