"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ImageIcon,
  Package,
  Pencil,
  Plus,
  Power,
  Search,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Category = {
  id: number;
  name: string;
  isActive: boolean;
};

type Brand = {
  id: number;
  name: string;
  isActive: boolean;
};

type Unit = {
  id: number;
  name: string;
  shortName: string;
  isActive: boolean;
};

type Tax = {
  id: number;
  name: string;
  rate: number | string;
  isActive: boolean;
};

type Product = {
  id: number;
  code: string;
  imageUrl: string | null;
  barcode: string | null;
  name: string;
  description: string | null;

  categoryId: number;
  brandId: number | null;
  unitId: number;
  taxId: number | null;

  purchasePrice: number | string;
  sellingPrice: number | string;
  wholesalePrice: number | string | null;
  minimumStock: number | string;

  status: "ACTIVE" | "INACTIVE";

  createdAt: string;
  updatedAt: string;

  category?: Category;
  brand?: Brand | null;
  unit?: Unit;
  tax?: Tax | null;
};

type ProductForm = {
  code: string;
  barcode: string;
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  unitId: string;
  taxId: string;
  purchasePrice: string;
  sellingPrice: string;
  wholesalePrice: string;
  minimumStock: string;
  status: "ACTIVE" | "INACTIVE";
  image: File | null;
};

const emptyForm: ProductForm = {
  code: "",
  barcode: "",
  name: "",
  description: "",
  categoryId: "",
  brandId: "",
  unitId: "",
  taxId: "",
  purchasePrice: "",
  sellingPrice: "",
  wholesalePrice: "",
  minimumStock: "0",
  status: "ACTIVE",
  image: null,
};

export default function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingPermissions, setLoadingPermissions] =
    useState(true);

  const [permissions, setPermissions] = useState<
    string[]
  >([]);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(
    null
  );

  const [form, setForm] = useState<ProductForm>({
    ...emptyForm,
  });

  const [imagePreview, setImagePreview] = useState<
    string | null
  >(null);

  const [search, setSearch] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  // ============================================================
  // Permissions
  // ============================================================

  const canCreate = permissions.includes(
    "PRODUCT_CREATE"
  );

  const canUpdate = permissions.includes(
    "PRODUCT_UPDATE"
  );

  useEffect(() => {
    loadPermissions();
    loadProducts();
    loadOptions();
  }, []);

  async function loadPermissions() {
    try {
      setLoadingPermissions(true);

      const response = await fetch(
        "/api/auth/permissions",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(
          result.message ||
            "Unable to load permissions."
        );
        return;
      }

      setPermissions(
        Array.isArray(result.data)
          ? result.data
          : []
      );
    } catch (error) {
      console.error(
        "LOAD PRODUCT PERMISSIONS ERROR:",
        error
      );

      toast.error(
        "Unable to load permissions."
      );
    } finally {
      setLoadingPermissions(false);
    }
  }

  async function loadProducts() {
    try {
      setLoading(true);

      const response = await fetch("/api/products");
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(
          result.message || "Unable to load products."
        );
        return;
      }

      setProducts(result.data);
    } catch (error) {
      console.error("LOAD PRODUCTS ERROR:", error);
      toast.error("Unable to load products.");
    } finally {
      setLoading(false);
    }
  }

  async function loadOptions() {
    try {
      setLoadingOptions(true);

      const [
        categoriesResponse,
        brandsResponse,
        unitsResponse,
        taxesResponse,
      ] = await Promise.all([
        fetch("/api/products/categories"),
        fetch("/api/products/brands"),
        fetch("/api/products/units"),
        fetch("/api/taxes"),
      ]);

      const [
        categoriesResult,
        brandsResult,
        unitsResult,
        taxesResult,
      ] = await Promise.all([
        categoriesResponse.json(),
        brandsResponse.json(),
        unitsResponse.json(),
        taxesResponse.json(),
      ]);

      if (
        categoriesResponse.ok &&
        categoriesResult.success
      ) {
        setCategories(
          categoriesResult.data.filter(
            (item: Category) => item.isActive
          )
        );
      } else {
        toast.error(
          categoriesResult.message ||
            "Unable to load categories."
        );
      }

      if (brandsResponse.ok && brandsResult.success) {
        setBrands(
          brandsResult.data.filter(
            (item: Brand) => item.isActive
          )
        );
      } else {
        toast.error(
          brandsResult.message ||
            "Unable to load brands."
        );
      }

      if (unitsResponse.ok && unitsResult.success) {
        setUnits(
          unitsResult.data.filter(
            (item: Unit) => item.isActive
          )
        );
      } else {
        toast.error(
          unitsResult.message ||
            "Unable to load units."
        );
      }

      if (taxesResponse.ok && taxesResult.success) {
        setTaxes(
          taxesResult.data.filter(
            (item: Tax) => item.isActive
          )
        );
      } else {
        toast.error(
          taxesResult.message ||
            "Unable to load taxes."
        );
      }
    } catch (error) {
      console.error("LOAD OPTIONS ERROR:", error);

      toast.error(
        "Unable to load product dropdown data."
      );
    } finally {
      setLoadingOptions(false);
    }
  }

  function updateForm(
    field: keyof ProductForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleImageChange(file: File | null) {
    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Only JPG, JPEG, PNG and WebP images are allowed."
      );
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error(
        "Product image cannot be larger than 5 MB."
      );
      return;
    }

    if (
      imagePreview &&
      imagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setForm((current) => ({
      ...current,
      image: file,
    }));

    setImagePreview(previewUrl);
  }

  function removeSelectedImage() {
    if (
      imagePreview &&
      imagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(imagePreview);
    }

    setForm((current) => ({
      ...current,
      image: null,
    }));

    if (editingId) {
      const product = products.find(
        (item) => item.id === editingId
      );

      setImagePreview(product?.imageUrl || null);
    } else {
      setImagePreview(null);
    }
  }

  function openAddModal() {
    if (!canCreate) {
      toast.error(
        "You do not have permission to create products."
      );
      return;
    }

    if (
      imagePreview &&
      imagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(imagePreview);
    }

    setEditingId(null);

    setForm({
      ...emptyForm,
    });

    setImagePreview(null);

    setShowModal(true);
  }

  function openEditModal(product: Product) {
    if (!canUpdate) {
      toast.error(
        "You do not have permission to update products."
      );
      return;
    }

    if (
      imagePreview &&
      imagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(imagePreview);
    }

    setEditingId(product.id);

    setForm({
      code: product.code,
      barcode: product.barcode || "",
      name: product.name,
      description: product.description || "",
      categoryId: product.categoryId.toString(),
      brandId:
        product.brandId !== null
          ? product.brandId.toString()
          : "",
      unitId: product.unitId.toString(),
      taxId:
        product.taxId !== null
          ? product.taxId.toString()
          : "",
      purchasePrice: String(product.purchasePrice),
      sellingPrice: String(product.sellingPrice),
      wholesalePrice:
        product.wholesalePrice !== null
          ? String(product.wholesalePrice)
          : "",
      minimumStock: String(product.minimumStock),
      status: product.status,
      image: null,
    });

    setImagePreview(product.imageUrl || null);

    setShowModal(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    if (
      imagePreview &&
      imagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(imagePreview);
    }

    setShowModal(false);
    setImagePreview(null);
    setEditingId(null);

    setForm({
      ...emptyForm,
    });
  }

  async function saveProduct() {
    if (editingId && !canUpdate) {
      toast.error(
        "You do not have permission to update products."
      );
      return;
    }

    if (!editingId && !canCreate) {
      toast.error(
        "You do not have permission to create products."
      );
      return;
    }

    if (!form.code.trim()) {
      toast.error("Product code is required.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Product name is required.");
      return;
    }

    if (!form.categoryId) {
      toast.error("Please select a category.");
      return;
    }

    if (!form.unitId) {
      toast.error("Please select a unit.");
      return;
    }

    if (!form.purchasePrice.trim()) {
      toast.error("Purchase price is required.");
      return;
    }

    if (!form.sellingPrice.trim()) {
      toast.error("Selling price is required.");
      return;
    }

    const purchasePrice = Number(form.purchasePrice);
    const sellingPrice = Number(form.sellingPrice);

    const wholesalePrice = form.wholesalePrice.trim()
      ? Number(form.wholesalePrice)
      : null;

    const minimumStock = form.minimumStock.trim()
      ? Number(form.minimumStock)
      : 0;

    if (
      Number.isNaN(purchasePrice) ||
      purchasePrice < 0
    ) {
      toast.error("Enter a valid purchase price.");
      return;
    }

    if (
      Number.isNaN(sellingPrice) ||
      sellingPrice < 0
    ) {
      toast.error("Enter a valid selling price.");
      return;
    }

    if (
      wholesalePrice !== null &&
      (Number.isNaN(wholesalePrice) ||
        wholesalePrice < 0)
    ) {
      toast.error("Enter a valid wholesale price.");
      return;
    }

    if (
      Number.isNaN(minimumStock) ||
      minimumStock < 0
    ) {
      toast.error("Enter a valid minimum stock.");
      return;
    }

    try {
      setSaving(true);

      const method = editingId ? "PUT" : "POST";

      const formData = new FormData();

      if (editingId) {
        formData.append("id", editingId.toString());
      }

      formData.append("code", form.code.trim());
      formData.append("barcode", form.barcode.trim());
      formData.append("name", form.name.trim());

      formData.append(
        "description",
        form.description.trim()
      );

      formData.append(
        "categoryId",
        form.categoryId
      );

      formData.append("brandId", form.brandId);
      formData.append("unitId", form.unitId);
      formData.append("taxId", form.taxId);

      formData.append(
        "purchasePrice",
        purchasePrice.toString()
      );

      formData.append(
        "sellingPrice",
        sellingPrice.toString()
      );

      formData.append(
        "wholesalePrice",
        wholesalePrice !== null
          ? wholesalePrice.toString()
          : ""
      );

      formData.append(
        "minimumStock",
        minimumStock.toString()
      );

      formData.append("status", form.status);

      if (form.image) {
        formData.append("image", form.image);
      }

      const response = await fetch("/api/products", {
        method,
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(
          result.message || "Unable to save product."
        );
        return;
      }

      if (editingId) {
        setProducts((current) =>
          current
            .map((product) =>
              product.id === editingId
                ? result.data
                : product
            )
            .sort((a, b) =>
              a.name.localeCompare(b.name)
            )
        );

        toast.success(
          "Product updated successfully."
        );
      } else {
        setProducts((current) =>
          [...current, result.data].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );

        toast.success(
          "Product created successfully."
        );
      }

      if (
        imagePreview &&
        imagePreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(imagePreview);
      }

      setShowModal(false);
      setImagePreview(null);
      setEditingId(null);

      setForm({
        ...emptyForm,
      });
    } catch (error) {
      console.error("SAVE PRODUCT ERROR:", error);
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function openStatusConfirmation(product: Product) {
    if (!canUpdate) {
      toast.error(
        "You do not have permission to update products."
      );
      return;
    }

    setSelectedProduct(product);
    setConfirmOpen(true);
  }

  async function toggleProductStatus() {
    if (!selectedProduct) {
      return;
    }

    if (!canUpdate) {
      toast.error(
        "You do not have permission to update products."
      );
      return;
    }

    try {
      const response = await fetch("/api/products", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: selectedProduct.id,
          code: selectedProduct.code,
          barcode: selectedProduct.barcode || "",
          name: selectedProduct.name,

          description:
            selectedProduct.description || "",

          imageUrl: selectedProduct.imageUrl,

          categoryId: selectedProduct.categoryId,
          brandId: selectedProduct.brandId,
          unitId: selectedProduct.unitId,
          taxId: selectedProduct.taxId,

          purchasePrice: Number(
            selectedProduct.purchasePrice
          ),

          sellingPrice: Number(
            selectedProduct.sellingPrice
          ),

          wholesalePrice:
            selectedProduct.wholesalePrice !== null
              ? Number(
                  selectedProduct.wholesalePrice
                )
              : null,

          minimumStock: Number(
            selectedProduct.minimumStock
          ),

          status:
            selectedProduct.status === "ACTIVE"
              ? "INACTIVE"
              : "ACTIVE",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(
          result.message ||
            "Unable to update product status."
        );
        return;
      }

      setProducts((current) =>
        current.map((product) =>
          product.id === selectedProduct.id
            ? result.data
            : product
        )
      );

      toast.success(
        result.data.status === "ACTIVE"
          ? "Product activated successfully."
          : "Product deactivated successfully."
      );

      setConfirmOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error(
        "TOGGLE PRODUCT STATUS ERROR:",
        error
      );

      toast.error("Something went wrong.");
    }
  }

  const filteredProducts = useMemo(() => {
    const searchText = search
      .toLowerCase()
      .trim();

    if (!searchText) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.code
          .toLowerCase()
          .includes(searchText) ||
        product.name
          .toLowerCase()
          .includes(searchText) ||
        (product.barcode || "")
          .toLowerCase()
          .includes(searchText) ||
        (product.category?.name || "")
          .toLowerCase()
          .includes(searchText) ||
        (product.brand?.name || "")
          .toLowerCase()
          .includes(searchText)
      );
    });
  }, [products, search]);

  function formatPrice(
    value: number | string | null
  ) {
    if (value === null || value === undefined) {
      return "-";
    }

    return Number(value).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Products
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage products, prices, stock levels,
              images, and product information.
            </p>
          </div>

          {/* Create permission */}
          {!loadingPermissions && canCreate && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          )}
        </div>

        {/* Search */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search products..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>

        {/* Product Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    #
                  </th>

                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    Code
                  </th>

                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    Product
                  </th>

                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    Category
                  </th>

                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    Brand
                  </th>

                  <th className="px-5 py-3 text-left font-semibold text-slate-600">
                    Unit
                  </th>

                  <th className="px-5 py-3 text-right font-semibold text-slate-600">
                    Selling Price
                  </th>

                  <th className="px-5 py-3 text-right font-semibold text-slate-600">
                    Min. Stock
                  </th>

                  <th className="px-5 py-3 text-center font-semibold text-slate-600">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Loading products...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(
                    (product, index) => (
                      <tr
                        key={product.id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 text-slate-500">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {product.code}
                          </span>
                        </td>

                        {/* Product + Image */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-slate-300" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-medium text-slate-900">
                                {product.name}
                              </p>

                              {product.barcode && (
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {product.barcode}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {product.category?.name ||
                            "-"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {product.brand?.name || "-"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {product.unit?.shortName ||
                            product.unit?.name ||
                            "-"}
                        </td>

                        <td className="px-5 py-4 text-right font-medium text-slate-900">
                          Rs.{" "}
                          {formatPrice(
                            product.sellingPrice
                          )}
                        </td>

                        <td className="px-5 py-4 text-right text-slate-600">
                          {product.minimumStock}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              product.status ===
                              "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {product.status ===
                            "ACTIVE"
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            {/* Update permission */}
                            {!loadingPermissions &&
                              canUpdate && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditModal(
                                        product
                                      )
                                    }
                                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                    title="Edit"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openStatusConfirmation(
                                        product
                                      )
                                    }
                                    className={`rounded-lg p-2 transition ${
                                      product.status ===
                                      "ACTIVE"
                                        ? "text-red-500 hover:bg-red-50"
                                        : "text-emerald-600 hover:bg-emerald-50"
                                    }`}
                                    title={
                                      product.status ===
                                      "ACTIVE"
                                        ? "Deactivate"
                                        : "Activate"
                                    }
                                  >
                                    <Power className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 text-sm text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {filteredProducts.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-700">
            {products.length}
          </span>{" "}
          products
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId
                    ? "Edit Product"
                    : "Add Product"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingId
                    ? "Update the product details."
                    : "Create a new product."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-5 px-6 py-5">
              {/* Product Image */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Product Image
                </label>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Preview */}
                    <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Product preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300">
                          <ImageIcon className="h-8 w-8" />
                          <span className="mt-2 text-xs">
                            No Image
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Upload */}
                    <div className="flex-1">
                      <label
                        htmlFor="product-image"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <Upload className="h-4 w-4" />

                        {imagePreview
                          ? "Change Image"
                          : "Choose Image"}
                      </label>

                      <input
                        id="product-image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={saving}
                        onChange={(event) => {
                          const file =
                            event.target.files?.[0] ||
                            null;

                          handleImageChange(file);

                          event.currentTarget.value =
                            "";
                        }}
                      />

                      <p className="mt-2 text-xs text-slate-500">
                        JPG, JPEG, PNG or WebP.
                        Maximum file size 5 MB.
                      </p>

                      {form.image && (
                        <div className="mt-2 flex items-center gap-2">
                          <p className="max-w-xs truncate text-xs font-medium text-slate-700">
                            {form.image.name}
                          </p>

                          <button
                            type="button"
                            onClick={
                              removeSelectedImage
                            }
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Code + Barcode */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Product Code
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    value={form.code}
                    onChange={(event) =>
                      updateForm(
                        "code",
                        event.target.value
                      )
                    }
                    maxLength={50}
                    placeholder="e.g. PEN-001"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Barcode
                  </label>

                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(event) =>
                      updateForm(
                        "barcode",
                        event.target.value
                      )
                    }
                    maxLength={100}
                    placeholder="Optional barcode"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Product Name
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateForm(
                      "name",
                      event.target.value
                    )
                  }
                  maxLength={200}
                  placeholder="Enter product name"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400"
                />
              </div>

              {/* Category + Brand */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Category
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <select
                    value={form.categoryId}
                    onChange={(event) =>
                      updateForm(
                        "categoryId",
                        event.target.value
                      )
                    }
                    disabled={loadingOptions}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                  >
                    <option value="">
                      Select Category
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Brand
                  </label>

                  <select
                    value={form.brandId}
                    onChange={(event) =>
                      updateForm(
                        "brandId",
                        event.target.value
                      )
                    }
                    disabled={loadingOptions}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                  >
                    <option value="">
                      Select Brand
                    </option>

                    {brands.map((brand) => (
                      <option
                        key={brand.id}
                        value={brand.id}
                      >
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unit + Tax */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Unit
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <select
                    value={form.unitId}
                    onChange={(event) =>
                      updateForm(
                        "unitId",
                        event.target.value
                      )
                    }
                    disabled={loadingOptions}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                  >
                    <option value="">
                      Select Unit
                    </option>

                    {units.map((unit) => (
                      <option
                        key={unit.id}
                        value={unit.id}
                      >
                        {unit.name} ({unit.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Tax
                  </label>

                  <select
                    value={form.taxId}
                    onChange={(event) =>
                      updateForm(
                        "taxId",
                        event.target.value
                      )
                    }
                    disabled={loadingOptions}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                  >
                    <option value="">No Tax</option>

                    {taxes.map((tax) => (
                      <option
                        key={tax.id}
                        value={tax.id}
                      >
                        {tax.name} ({tax.rate}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prices */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Purchase Price
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchasePrice}
                    onChange={(event) =>
                      updateForm(
                        "purchasePrice",
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Selling Price
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={(event) =>
                      updateForm(
                        "sellingPrice",
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Wholesale Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.wholesalePrice}
                    onChange={(event) =>
                      updateForm(
                        "wholesalePrice",
                        event.target.value
                      )
                    }
                    placeholder="Optional"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Minimum Stock + Status */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Minimum Stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.minimumStock}
                    onChange={(event) =>
                      updateForm(
                        "minimumStock",
                        event.target.value
                      )
                    }
                    placeholder="0"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>

                {editingId && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateForm(
                          "status",
                          event.target.value
                        )
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
                    >
                      <option value="ACTIVE">
                        Active
                      </option>

                      <option value="INACTIVE">
                        Inactive
                      </option>
                    </select>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm(
                      "description",
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Optional product description"
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveProduct}
                disabled={
                  saving ||
                  loadingOptions ||
                  loadingPermissions ||
                  (editingId
                    ? !canUpdate
                    : !canCreate)
                }
                className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Product"
                    : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Confirmation */}
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);

          if (!open) {
            setSelectedProduct(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedProduct?.status === "ACTIVE"
                ? "Deactivate Product?"
                : "Activate Product?"}
            </AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to{" "}
              {selectedProduct?.status === "ACTIVE"
                ? "deactivate"
                : "activate"}{" "}
              <strong>
                {selectedProduct?.name}
              </strong>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={toggleProductStatus}
              className={
                selectedProduct?.status === "ACTIVE"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {selectedProduct?.status === "ACTIVE"
                ? "Deactivate"
                : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}