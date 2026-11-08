
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - POS Products + Services + Database Categories
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    // ---------------------------------------------------------
    // 1. Fetch Active Product Categories
    // ---------------------------------------------------------

    const productCategories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    // ---------------------------------------------------------
    // 2. Fetch Active Service Categories
    // ---------------------------------------------------------

    const serviceCategories = await prisma.servicecategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    // ---------------------------------------------------------
    // 3. Products
    // ---------------------------------------------------------

    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { code: { contains: search } },
                { barcode: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: {
        name: "asc",
      },
      include: {
        unit: true,
        category: true,
        brand: true,
        tax: true,
        stock: true,
      },
    });

    // ---------------------------------------------------------
    // 4. Services
    // ---------------------------------------------------------

    const services = await prisma.service.findMany({
      where: {
        status: "ACTIVE",
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { code: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: {
        name: "asc",
      },
      include: {
        servicecategory: true,
        tax: true,
      },
    });

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
      purchasePrice: Number(product.purchasePrice),
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
      const paperCost = Number(service.paperCost || 0);
      const tonerCost = Number(service.tonerCost || 0);
      const machineCost = Number(service.machineCost || 0);
      const totalCost = paperCost + tonerCost + machineCost;

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
        paperCost,
        tonerCost,
        machineCost,
        costPrice: totalCost,
        netProfit: Number(service.basePrice) - totalCost,
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

    const productCategoryData = productCategories.map((category) => ({
      ...category,
      type: "PRODUCT" as const,
      count: productData.filter(
        (item) => item.categoryId === category.id
      ).length,
    }));

    const serviceCategoryData = serviceCategories.map((category) => ({
      ...category,
      type: "SERVICE" as const,
      count: serviceData.filter(
        (item) => item.categoryId === category.id
      ).length,
    }));

    // ---------------------------------------------------------
    // 8. Combined POS Items
    // ---------------------------------------------------------

    const data = [...productData, ...serviceData];

    return NextResponse.json({
      success: true,
      data,
      categories: {
        products: productCategoryData,
        services: serviceCategoryData,
      },
    });
    
  }
   catch (error) {
    console.error("GET POS ITEMS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load POS products and services.",
      },
      { status: 500 }
    );

    const dbInfo = await prisma.$queryRaw<
  Array<{ databaseName: string }>
>`SELECT DATABASE() AS databaseName`;

console.log("POS CONNECTED DATABASE:", dbInfo);
  }
  
  
}
