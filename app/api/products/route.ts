import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function getImageExtension(type: string) {
  switch (type) {
    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    case "image/jpeg":
    default:
      return "jpg";
  }
}

async function saveProductImage(file: File) {
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(
      "Image size cannot exceed 5 MB."
    );
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      "Only JPG, PNG, and WebP images are allowed."
    );
  }

  const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "products"
  );

  await mkdir(uploadDirectory, {
    recursive: true,
  });

  const extension = getImageExtension(
    file.type
  );

  const fileName = `product-${randomUUID()}.${extension}`;

  const filePath = path.join(
    uploadDirectory,
    fileName
  );

  const bytes = await file.arrayBuffer();

  const buffer = Buffer.from(bytes);

  await writeFile(filePath, buffer);

  return {
    fileName,
    filePath,
    imageUrl: `/uploads/products/${fileName}`,
  };
}

async function deleteProductImage(
  imageUrl: string | null | undefined
) {
  if (!imageUrl) {
    return;
  }

  if (
    !imageUrl.startsWith(
      "/uploads/products/"
    )
  ) {
    return;
  }

  const fileName = path.basename(
    imageUrl
  );

  const filePath = path.join(
    process.cwd(),
    "public",
    "uploads",
    "products",
    fileName
  );

  try {
    await unlink(filePath);
  } catch {
    // File may already be deleted.
  }
}

// ============================================================
// GET - Get all products
// Permission: PRODUCT_VIEW
// ============================================================

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  const allowed = await hasPermission(
    "PRODUCT_VIEW"
  );

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        message:
          "You do not have permission to view products.",
      },
      { status: 403 }
    );
  }

  try {
    const products =
      await prisma.product.findMany({
        orderBy: {
          name: "asc",
        },
        include: {
          category: true,
          brand: true,
          unit: true,
          tax: true,
        },
      });

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error(
      "GET PRODUCTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load products.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST - Create new product
// Permission: PRODUCT_CREATE
// ============================================================

export async function POST(
  request: Request
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  const allowed = await hasPermission(
    "PRODUCT_CREATE"
  );

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        message:
          "You do not have permission to create products.",
      },
      { status: 403 }
    );
  }

  let uploadedImagePath:
    | string
    | null = null;

  try {
    const formData =
      await request.formData();

    const code =
      typeof formData.get("code") ===
      "string"
        ? String(
            formData.get("code")
          ).trim()
        : "";

    const barcode =
      typeof formData.get("barcode") ===
      "string"
        ? String(
            formData.get("barcode")
          ).trim()
        : "";

    const name =
      typeof formData.get("name") ===
      "string"
        ? String(
            formData.get("name")
          ).trim()
        : "";

    const description =
      typeof formData.get(
        "description"
      ) === "string"
        ? String(
            formData.get("description")
          ).trim()
        : "";

    const categoryId = Number(
      formData.get("categoryId")
    );

    const brandValue =
      formData.get("brandId");

    const brandId =
      brandValue !== null &&
      brandValue !== ""
        ? Number(brandValue)
        : null;

    const unitId = Number(
      formData.get("unitId")
    );

    const taxValue =
      formData.get("taxId");

    const taxId =
      taxValue !== null &&
      taxValue !== ""
        ? Number(taxValue)
        : null;

    const purchasePrice = Number(
      formData.get("purchasePrice")
    );

    const sellingPrice = Number(
      formData.get("sellingPrice")
    );

    const wholesaleValue =
      formData.get("wholesalePrice");

    const wholesalePrice =
      wholesaleValue !== null &&
      wholesaleValue !== ""
        ? Number(wholesaleValue)
        : null;

    const minimumStockValue =
      formData.get("minimumStock");

    const minimumStock =
      minimumStockValue !== null &&
      minimumStockValue !== ""
        ? Number(minimumStockValue)
        : 0;

    const image = formData.get(
      "image"
    );

    // --------------------------------------------------------
    // Validation
    // --------------------------------------------------------

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product code is required.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product name is required.",
        },
        { status: 400 }
      );
    }

    if (
      !categoryId ||
      Number.isNaN(categoryId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Category is required.",
        },
        { status: 400 }
      );
    }

    if (
      !unitId ||
      Number.isNaN(unitId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unit is required.",
        },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(purchasePrice) ||
      purchasePrice < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid purchase price is required.",
        },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(sellingPrice) ||
      sellingPrice < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid selling price is required.",
        },
        { status: 400 }
      );
    }

    if (
      wholesalePrice !== null &&
      (Number.isNaN(
        wholesalePrice
      ) ||
        wholesalePrice < 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Wholesale price must be valid.",
        },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(minimumStock) ||
      minimumStock < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Minimum stock must be valid.",
        },
        { status: 400 }
      );
    }

    if (code.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product code cannot exceed 50 characters.",
        },
        { status: 400 }
      );
    }

    if (barcode.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Barcode cannot exceed 100 characters.",
        },
        { status: 400 }
      );
    }

    if (name.length > 200) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product name cannot exceed 200 characters.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // Duplicate code
    // --------------------------------------------------------

    const existingCode =
      await prisma.product.findUnique({
        where: {
          code,
        },
      });

    if (existingCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A product with this code already exists.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------------
    // Duplicate barcode
    // --------------------------------------------------------

    if (barcode) {
      const existingBarcode =
        await prisma.product.findUnique({
          where: {
            barcode,
          },
        });

      if (existingBarcode) {
        return NextResponse.json(
          {
            success: false,
            message:
              "A product with this barcode already exists.",
          },
          { status: 409 }
        );
      }
    }

    // --------------------------------------------------------
    // Check Category
    // --------------------------------------------------------

    const category =
      await prisma.category.findUnique({
        where: {
          id: categoryId,
        },
      });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected category was not found.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // Check Brand
    // --------------------------------------------------------

    if (brandId !== null) {
      const brand =
        await prisma.brand.findUnique({
          where: {
            id: brandId,
          },
        });

      if (!brand) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected brand was not found.",
          },
          { status: 400 }
        );
      }
    }

    // --------------------------------------------------------
    // Check Unit
    // --------------------------------------------------------

    const unit =
      await prisma.unit.findUnique({
        where: {
          id: unitId,
        },
      });

    if (!unit) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected unit was not found.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // Check Tax
    // --------------------------------------------------------

    if (taxId !== null) {
      const tax =
        await prisma.tax.findUnique({
          where: {
            id: taxId,
          },
        });

      if (!tax) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected tax was not found.",
          },
          { status: 400 }
        );
      }
    }

    // --------------------------------------------------------
    // Save image
    // --------------------------------------------------------

    let imageUrl: string | null =
      null;

    if (
      image instanceof File &&
      image.size > 0
    ) {
      const savedImage =
        await saveProductImage(
          image
        );

      imageUrl =
        savedImage.imageUrl;

      uploadedImagePath =
        savedImage.filePath;
    }

    // --------------------------------------------------------
    // Create product
    // --------------------------------------------------------

    const product =
      await prisma.product.create({
        data: {
          code,
          barcode: barcode || null,
          name,
          description:
            description || null,
          imageUrl,
          categoryId,
          brandId,
          unitId,
          taxId,
          purchasePrice,
          sellingPrice,
          wholesalePrice,
          minimumStock,
          status: "ACTIVE",
          updatedAt: new Date(),
        },

        include: {
          category: true,
          brand: true,
          unit: true,
          tax: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Product created successfully.",
        data: product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE PRODUCT ERROR:",
      error
    );

    if (uploadedImagePath) {
      try {
        await unlink(
          uploadedImagePath
        );
      } catch {}
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create product.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT - Update product
// Permission: PRODUCT_UPDATE
// ============================================================

export async function PUT(
  request: Request
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  const allowed = await hasPermission(
    "PRODUCT_UPDATE"
  );

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        message:
          "You do not have permission to update products.",
      },
      { status: 403 }
    );
  }

  let uploadedImagePath:
    | string
    | null = null;

  try {
    const contentType =
      request.headers.get(
        "content-type"
      ) || "";

    let body: any;
    let image: File | null = null;

    if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const formData =
        await request.formData();

      body = {
        id: formData.get("id"),
        code: formData.get("code"),
        barcode:
          formData.get("barcode"),
        name: formData.get("name"),
        description:
          formData.get("description"),
        categoryId:
          formData.get("categoryId"),
        brandId:
          formData.get("brandId"),
        unitId:
          formData.get("unitId"),
        taxId:
          formData.get("taxId"),
        purchasePrice:
          formData.get("purchasePrice"),
        sellingPrice:
          formData.get("sellingPrice"),
        wholesalePrice:
          formData.get("wholesalePrice"),
        minimumStock:
          formData.get("minimumStock"),
        status:
          formData.get("status"),
      };

      const imageValue =
        formData.get("image");

      if (
        imageValue instanceof File &&
        imageValue.size > 0
      ) {
        image = imageValue;
      }
    } else {
      body =
        await request.json();
    }

    const id = Number(body.id);

    const code =
      typeof body.code === "string"
        ? body.code.trim()
        : "";

    const barcode =
      typeof body.barcode ===
      "string"
        ? body.barcode.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description ===
      "string"
        ? body.description.trim()
        : "";

    const categoryId = Number(
      body.categoryId
    );

    const brandId =
      body.brandId !== null &&
      body.brandId !== undefined &&
      body.brandId !== ""
        ? Number(body.brandId)
        : null;

    const unitId = Number(
      body.unitId
    );

    const taxId =
      body.taxId !== null &&
      body.taxId !== undefined &&
      body.taxId !== ""
        ? Number(body.taxId)
        : null;

    const purchasePrice = Number(
      body.purchasePrice
    );

    const sellingPrice = Number(
      body.sellingPrice
    );

    const wholesalePrice =
      body.wholesalePrice !== null &&
      body.wholesalePrice !==
        undefined &&
      body.wholesalePrice !== ""
        ? Number(
            body.wholesalePrice
          )
        : null;

    const minimumStock =
      body.minimumStock !== null &&
      body.minimumStock !==
        undefined &&
      body.minimumStock !== ""
        ? Number(
            body.minimumStock
          )
        : 0;

    const status =
      body.status === "INACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    // --------------------------------------------------------
    // Validation
    // --------------------------------------------------------

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid product ID is required.",
        },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product code is required.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product name is required.",
        },
        { status: 400 }
      );
    }

    if (
      !categoryId ||
      Number.isNaN(categoryId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Category is required.",
        },
        { status: 400 }
      );
    }

    if (
      !unitId ||
      Number.isNaN(unitId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unit is required.",
        },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(purchasePrice) ||
      purchasePrice < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid purchase price is required.",
        },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(sellingPrice) ||
      sellingPrice < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid selling price is required.",
        },
        { status: 400 }
      );
    }

    if (
      wholesalePrice !== null &&
      (Number.isNaN(
        wholesalePrice
      ) ||
        wholesalePrice < 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Wholesale price must be valid.",
        },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(minimumStock) ||
      minimumStock < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Minimum stock must be valid.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // Find existing product
    // --------------------------------------------------------

    const existingProduct =
      await prisma.product.findUnique({
        where: {
          id,
        },
      });

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product not found.",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------------
    // Duplicate code
    // --------------------------------------------------------

    const duplicateCode =
      await prisma.product.findFirst({
        where: {
          code,
          NOT: {
            id,
          },
        },
      });

    if (duplicateCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another product with this code already exists.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------------
    // Duplicate barcode
    // --------------------------------------------------------

    if (barcode) {
      const duplicateBarcode =
        await prisma.product.findFirst({
          where: {
            barcode,
            NOT: {
              id,
            },
          },
        });

      if (duplicateBarcode) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Another product with this barcode already exists.",
          },
          { status: 409 }
        );
      }
    }

    // --------------------------------------------------------
    // Check Category
    // --------------------------------------------------------

    const category =
      await prisma.category.findUnique({
        where: {
          id: categoryId,
        },
      });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected category was not found.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // Check Brand
    // --------------------------------------------------------

    if (brandId !== null) {
      const brand =
        await prisma.brand.findUnique({
          where: {
            id: brandId,
          },
        });

      if (!brand) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected brand was not found.",
          },
          { status: 400 }
        );
      }
    }

    // --------------------------------------------------------
    // Check Unit
    // --------------------------------------------------------

    const unit =
      await prisma.unit.findUnique({
        where: {
          id: unitId,
        },
      });

    if (!unit) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Selected unit was not found.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // Check Tax
    // --------------------------------------------------------

    if (taxId !== null) {
      const tax =
        await prisma.tax.findUnique({
          where: {
            id: taxId,
          },
        });

      if (!tax) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected tax was not found.",
          },
          { status: 400 }
        );
      }
    }

    // --------------------------------------------------------
    // Handle image
    // --------------------------------------------------------

    let imageUrl =
      existingProduct.imageUrl;

    if (image) {
      const savedImage =
        await saveProductImage(
          image
        );

      imageUrl =
        savedImage.imageUrl;

      uploadedImagePath =
        savedImage.filePath;
    }

    // --------------------------------------------------------
    // Update product
    // --------------------------------------------------------

    const product =
      await prisma.product.update({
        where: {
          id,
        },

        data: {
          code,
          barcode: barcode || null,
          name,
          description:
            description || null,
          imageUrl,
          categoryId,
          brandId,
          unitId,
          taxId,
          purchasePrice,
          sellingPrice,
          wholesalePrice,
          minimumStock,
          status,
          updatedAt: new Date(),
        },

        include: {
          category: true,
          brand: true,
          unit: true,
          tax: true,
        },
      });

    // --------------------------------------------------------
    // Delete old image after successful DB update
    // --------------------------------------------------------

    if (
      image &&
      existingProduct.imageUrl &&
      existingProduct.imageUrl !==
        product.imageUrl
    ) {
      await deleteProductImage(
        existingProduct.imageUrl
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Product updated successfully.",
      data: product,
    });
  } catch (error) {
    console.error(
      "UPDATE PRODUCT ERROR:",
      error
    );

    if (uploadedImagePath) {
      try {
        await unlink(
          uploadedImagePath
        );
      } catch {}
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to update product.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}