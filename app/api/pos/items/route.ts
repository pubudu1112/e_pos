import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - POS Products + Services
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search =
      searchParams.get("search")?.trim() || "";

    // ---------------------------------------------------------
    // Products
    // ---------------------------------------------------------

    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",

        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                  },
                },
                {
                  code: {
                    contains: search,
                  },
                },
                {
                  barcode: {
                    contains: search,
                  },
                },
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
    // Services
    // ---------------------------------------------------------

    const services = await prisma.service.findMany({
      where: {
        status: "ACTIVE",

        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                  },
                },
                {
                  code: {
                    contains: search,
                  },
                },
              ],
            }
          : {}),
      },

      orderBy: {
        name: "asc",
      },

      // Load Service Category + Tax
      include: {
        servicecategory: true,
        tax: true,
      },
    });

    // ---------------------------------------------------------
    // Format Products
    // ---------------------------------------------------------

    const productData = products.map(
      (product) => ({
        id: product.id,

        code: product.code,

        name: product.name,

        // Product Image
        imageUrl:
          product.imageUrl || null,

        type: "PRODUCT" as const,

        price: Number(product.sellingPrice),

        purchasePrice: Number(product.purchasePrice),

        unit:
          product.unit?.shortName || "",

        category:
          product.category?.name || "",

        brand:
          product.brand?.name || "",

        barcode:
          product.barcode || null,

        stock:
          product.stock
            ? Number(
                product.stock.quantity
              )
            : 0,

        minimumStock:
          Number(
            product.minimumStock
          ),

        tax: product.tax
          ? {
              id: product.tax.id,

              name: product.tax.name,

              rate: Number(
                product.tax.rate
              ),
            }
          : null,

        warrantyMonths: product.warrantyMonths
          ? Number(product.warrantyMonths)
          : 0,
      })
    );

    // ---------------------------------------------------------
    // Format Services
    // ---------------------------------------------------------

    const serviceData = services.map(
      (service) => ({
        id: service.id,

        code: service.code,

        name: service.name,

        // Services don't have product images
        imageUrl: null,

        type: "SERVICE" as const,

        price: Number(
          service.basePrice
        ),

        // Services are sold by quantity
        unit: "Each",

        // Service Category
        category:
          service.servicecategory?.name ||
          "",

        // Services don't have brands
        brand: "",

        // Services don't have barcodes
        barcode: null,

        // Services don't maintain stock
        stock: null,

        minimumStock: null,

        // Service Costs & Profit (Sri Lankan Rupees)
        paperCost: Number(service.paperCost || 0),
        tonerCost: Number(service.tonerCost || 0),
        machineCost: Number(service.machineCost || 0),
        costPrice:
          Number(service.paperCost || 0) +
          Number(service.tonerCost || 0) +
          Number(service.machineCost || 0),
        netProfit:
          Number(service.basePrice) -
          (Number(service.paperCost || 0) +
            Number(service.tonerCost || 0) +
            Number(service.machineCost || 0)),

        // Service Tax
        tax: service.tax
          ? {
              id: service.tax.id,

              name: service.tax.name,

              rate: Number(
                service.tax.rate
              ),
            }
          : null,
      })
    );

    // ---------------------------------------------------------
    // Combined POS Items
    // ---------------------------------------------------------

    const data = [
      ...productData,
      ...serviceData,
    ];

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "GET POS ITEMS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load POS products and services.",
      },
      { status: 500 }
    );
  }
}