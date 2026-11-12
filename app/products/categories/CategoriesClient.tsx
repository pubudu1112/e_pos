"use client";

import { useEffect, useState } from "react";
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
  description: string | null;
  isActive: boolean;
  warrantyEnabled: boolean;
};

export default function CategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // Permissions
  // ============================================================

  const [loadingPermissions, setLoadingPermissions] =
    useState(true);

  const [permissions, setPermissions] =
    useState<string[]>([]);

  const canCreate =
    permissions.includes("CATEGORY_CREATE");

  const canUpdate =
    permissions.includes("CATEGORY_UPDATE");

  // ============================================================
  // Modal
  // ============================================================

  const [showModal, setShowModal] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [isActive, setIsActive] =
    useState(true);

  const [warrantyEnabled, setWarrantyEnabled] =
    useState(false);

  const [error, setError] =
    useState("");

  // ============================================================
  // Alert Dialog
  // ============================================================

  const [showStatusDialog, setShowStatusDialog] =
    useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState<Category | null>(null);

  const [statusUpdating, setStatusUpdating] =
    useState(false);

  // ============================================================
  // Initial Load
  // ============================================================

  useEffect(() => {
    loadPermissions();
    loadCategories();
  }, []);

  // ============================================================
  // Load Permissions
  // ============================================================

  async function loadPermissions() {
    try {
      setLoadingPermissions(true);

      const response = await fetch(
        "/api/auth/permissions",
        {
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (
        response.ok &&
        result.success &&
        Array.isArray(result.data)
      ) {
        setPermissions(result.data);
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error(
        "Load permissions error:",
        error
      );

      setPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  }

  // ============================================================
  // Load Categories
  // ============================================================

  async function loadCategories() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/products/categories"
      );

      const result =
        await response.json();

      if (result.success) {
        setCategories(result.data);
      } else {
        setError(
          result.message ||
          "Unable to load categories."
        );

        toast.error(
          result.message ||
          "Unable to load categories."
        );
      }
    } catch (error) {
      console.error(error);

      setError(
        "Unable to load categories."
      );

      toast.error(
        "Unable to load categories."
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // Open Add Modal
  // Permission: CATEGORY_CREATE
  // ============================================================

  function openAddModal() {
    if (!canCreate) {
      toast.error(
        "You do not have permission to create categories."
      );

      return;
    }

    setEditingId(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setWarrantyEnabled(false);
    setError("");
    setShowModal(true);
  }

  // ============================================================
  // Open Edit Modal
  // Permission: CATEGORY_UPDATE
  // ============================================================

  function openEditModal(
    category: Category
  ) {
    if (!canUpdate) {
      toast.error(
        "You do not have permission to update categories."
      );

      return;
    }

    setEditingId(category.id);
    setName(category.name);
    setDescription(
      category.description || ""
    );
    setIsActive(category.isActive);
    setWarrantyEnabled(
      category.warrantyEnabled ?? false
    );
    setError("");
    setShowModal(true);
  }

  // ============================================================
  // Close Modal
  // ============================================================

  function closeModal() {
    if (!saving) {
      setShowModal(false);
      setError("");
    }
  }

  // ============================================================
  // Save Category
  // Permission:
  // CREATE -> CATEGORY_CREATE
  // UPDATE -> CATEGORY_UPDATE
  // ============================================================

  async function saveCategory() {
    setError("");

    // ----------------------------------------------------------
    // Permission check
    // ----------------------------------------------------------

    if (editingId) {
      if (!canUpdate) {
        toast.error(
          "You do not have permission to update categories."
        );

        return;
      }
    } else {
      if (!canCreate) {
        toast.error(
          "You do not have permission to create categories."
        );

        return;
      }
    }

    // ----------------------------------------------------------
    // Validation
    // ----------------------------------------------------------

    if (!name.trim()) {
      setError(
        "Category name is required."
      );

      toast.error(
        "Category name is required."
      );

      return;
    }

    try {
      setSaving(true);

      const method = editingId
        ? "PUT"
        : "POST";

      const body = editingId
        ? {
          id: editingId,
          name: name.trim(),
          description: description.trim(),
          isActive,
          warrantyEnabled,
        }
        : {
          name: name.trim(),
          description: description.trim(),
          warrantyEnabled,
        };

      const response = await fetch(
        "/api/products/categories",
        {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        setError(
          result.message ||
          "Unable to save category."
        );

        toast.error(
          result.message ||
          "Unable to save category."
        );

        return;
      }

      // --------------------------------------------------------
      // Update existing category
      // --------------------------------------------------------

      if (editingId) {
        setCategories(
          (current) =>
            current
              .map((category) =>
                category.id ===
                  editingId
                  ? result.data
                  : category
              )
              .sort((a, b) =>
                a.name.localeCompare(
                  b.name
                )
              )
        );

        toast.success(
          "Category updated successfully."
        );
      }

      // --------------------------------------------------------
      // Create new category
      // --------------------------------------------------------

      else {
        setCategories(
          (current) =>
            [
              ...current,
              result.data,
            ].sort((a, b) =>
              a.name.localeCompare(
                b.name
              )
            )
        );

        toast.success(
          "Category created successfully."
        );
      }

      setShowModal(false);
      setError("");
    } catch (error) {
      console.error(error);

      setError(
        "Something went wrong."
      );

      toast.error(
        "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // Open Activate / Deactivate Confirmation
  // Permission: CATEGORY_UPDATE
  // ============================================================

  function openStatusDialog(
    category: Category
  ) {
    if (!canUpdate) {
      toast.error(
        "You do not have permission to update categories."
      );

      return;
    }

    setSelectedCategory(category);
    setShowStatusDialog(true);
  }

  // ============================================================
  // Close Status Dialog
  // ============================================================

  function closeStatusDialog() {
    if (!statusUpdating) {
      setShowStatusDialog(false);
      setSelectedCategory(null);
    }
  }

  // ============================================================
  // Confirm Activate / Deactivate
  // Permission: CATEGORY_UPDATE
  // ============================================================

  async function confirmStatusChange() {
    if (!selectedCategory) {
      return;
    }

    if (!canUpdate) {
      toast.error(
        "You do not have permission to update categories."
      );

      return;
    }

    const category =
      selectedCategory;

    const newStatus =
      !category.isActive;

    try {
      setStatusUpdating(true);

      const response = await fetch(
        "/api/products/categories",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: category.id,
            name: category.name,
            description: category.description,
            isActive: newStatus,
            warrantyEnabled: category.warrantyEnabled ?? false,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        toast.error(
          result.message ||
          "Unable to update category."
        );

        return;
      }

      setCategories(
        (current) =>
          current.map((item) =>
            item.id === category.id
              ? result.data
              : item
          )
      );

      toast.success(
        newStatus
          ? "Category activated successfully."
          : "Category deactivated successfully."
      );

      setShowStatusDialog(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error(error);

      toast.error(
        "Unable to update category."
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background text-foreground p-6">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">

        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-foreground">
            Categories
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-muted-foreground">
            Manage product categories
          </p>
        </div>

        {/* Add Category */}
        {!loadingPermissions &&
          canCreate && (
            <button
              type="button"
              onClick={openAddModal}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              + Add Category
            </button>
          )}

      </div>

      {/* Category List */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card shadow-sm">

        <div className="flex items-center justify-between border-b border-gray-200 dark:border-border px-5 py-4">

          <div>
            <h2 className="font-semibold text-gray-700 dark:text-foreground">
              Category List
            </h2>

            <p className="mt-1 text-xs text-gray-400 dark:text-muted-foreground">
              {categories.length} categor
              {categories.length === 1
                ? "y"
                : "ies"}
            </p>
          </div>

        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-500 dark:text-muted-foreground">
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center">

            <div className="mb-3 text-4xl">
              📂
            </div>

            <p className="font-medium text-gray-600 dark:text-muted-foreground">
              No categories found
            </p>

            <p className="mt-1 text-sm text-gray-400 dark:text-muted-foreground">
              Add your first product category.
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-gray-50 dark:bg-muted/40">

                <tr>

                  <th className="px-5 py-3 font-semibold text-gray-600 dark:text-muted-foreground">
                    ID
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-600 dark:text-muted-foreground">
                    Category Name
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-600 dark:text-muted-foreground">
                    Description
                  </th>

                  <th className="px-5 py-3 font-semibold text-gray-600 dark:text-muted-foreground">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right font-semibold text-gray-600 dark:text-muted-foreground">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {categories.map(
                  (category) => (

                    <tr
                      key={category.id}
                      className="border-t border-gray-100 dark:border-border/60 hover:bg-gray-50 dark:hover:bg-muted/30"
                    >

                      <td className="px-5 py-4 text-gray-600 dark:text-muted-foreground">
                        {category.id}
                      </td>

                      <td className="px-5 py-4 font-medium text-gray-800 dark:text-foreground">
                        {category.name}
                      </td>

                      <td className="px-5 py-4 text-gray-500 dark:text-muted-foreground">
                        {category.description ||
                          "-"}
                      </td>

                      <td className="px-5 py-4">

                        {/* Status button */}
                        {!loadingPermissions &&
                          canUpdate ? (
                          <button
                            type="button"
                            onClick={() =>
                              openStatusDialog(
                                category
                              )
                            }
                            className={`rounded-full px-3 py-1 text-xs font-medium ${category.isActive
                              ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                              : "bg-gray-100 dark:bg-muted text-gray-600 dark:text-muted-foreground"
                              }`}
                          >
                            {category.isActive
                              ? "Active"
                              : "Inactive"}
                          </button>
                        ) : (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${category.isActive
                              ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                              : "bg-gray-100 dark:bg-muted text-gray-600 dark:text-muted-foreground"
                              }`}
                          >
                            {category.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        )}

                      </td>

                      <td className="px-5 py-4 text-right">

                        {/* Edit */}
                        {!loadingPermissions &&
                          canUpdate && (
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  category
                                )
                              }
                              className="mr-4 text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Edit
                            </button>
                          )}

                        {/* Activate / Deactivate */}
                        {!loadingPermissions &&
                          canUpdate && (
                            <button
                              type="button"
                              onClick={() =>
                                openStatusDialog(
                                  category
                                )
                              }
                              className={
                                category.isActive
                                  ? "text-red-600 dark:text-red-400 hover:underline"
                                  : "text-green-600 dark:text-green-400 hover:underline"
                              }
                            >
                              {category.isActive
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          )}

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* Add / Edit Modal */}
      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">

          <div className="w-full max-w-md rounded-xl bg-white dark:bg-card border border-gray-200 dark:border-border shadow-xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-border px-6 py-4">

              <div>

                <h2 className="text-lg font-semibold text-gray-800 dark:text-foreground">
                  {editingId
                    ? "Edit Category"
                    : "Add Category"}
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-muted-foreground">
                  {editingId
                    ? "Update category information"
                    : "Create a new product category"}
                </p>

              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="text-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                ×
              </button>

            </div>

            {/* Modal Body */}
            <div className="space-y-5 px-6 py-6">

              {error && (
                <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Category Name */}
              <div>

                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Category Name
                  <span className="text-red-500">
                    {" "}*
                  </span>
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  placeholder="Enter category name"
                  disabled={saving}
                  className="w-full rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-muted/40 px-3 py-2.5 text-sm text-gray-900 dark:text-foreground outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

              {/* Description */}
              <div>

                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  placeholder="Enter description"
                  rows={3}
                  disabled={saving}
                  className="w-full resize-none rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-muted/40 px-3 py-2.5 text-sm text-gray-900 dark:text-foreground outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>



              {/* Warranty Setting */}
              <div
                className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${warrantyEnabled
                    ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-gray-200 dark:border-border bg-gray-50 dark:bg-muted/30"
                  }`}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-foreground">
                    Enable Warranty
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-muted-foreground">
                    {warrantyEnabled
                      ? "ON - Products in this category can have warranty."
                      : "OFF - Warranty is disabled for this category."}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={warrantyEnabled}
                  onClick={() =>
                    setWarrantyEnabled((prev) => !prev)
                  }
                  disabled={saving}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${warrantyEnabled
                      ? "bg-emerald-500"
                      : "bg-gray-300 dark:bg-muted"
                    }`}
                >
                  <span
                    className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${warrantyEnabled
                        ? "translate-x-5"
                        : "translate-x-0"
                      }`}
                  />
                </button>
              </div>



              {/* Status - Edit only */}
              {editingId && (

                <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-muted/30 px-4 py-3">

                  <div>

                    <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                      Category Status
                    </p>

                    <p className="text-xs text-gray-400 dark:text-muted-foreground">
                      Inactive categories won't be available for new products.
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsActive(
                        !isActive
                      )
                    }
                    disabled={saving}
                    className={`relative h-6 w-11 rounded-full transition ${isActive
                      ? "bg-green-500"
                      : "bg-gray-300 dark:bg-muted"
                      }`}
                  >

                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${isActive
                        ? "left-6"
                        : "left-1"
                        }`}
                    />

                  </button>

                </div>

              )}

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-border bg-gray-50 dark:bg-muted/30 px-6 py-4">

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-card px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-muted/50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveCategory}
                disabled={
                  saving ||
                  (editingId
                    ? !canUpdate
                    : !canCreate)
                }
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Category"
                    : "Save Category"}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =========================================
          ACTIVATE / DEACTIVATE ALERT DIALOG
          ========================================= */}

      <AlertDialog
        open={showStatusDialog}
        onOpenChange={(open) => {

          if (
            !open &&
            !statusUpdating
          ) {
            closeStatusDialog();
          }

        }}
      >

        <AlertDialogContent>

          <AlertDialogHeader>

            <AlertDialogTitle>
              {selectedCategory?.isActive
                ? "Deactivate Category?"
                : "Activate Category?"}
            </AlertDialogTitle>

            <AlertDialogDescription>

              {selectedCategory && (
                <>
                  Are you sure you want to{" "}

                  <strong>
                    {selectedCategory.isActive
                      ? "deactivate"
                      : "activate"}
                  </strong>{" "}

                  the category{" "}

                  <strong>
                    "{selectedCategory.name}"
                  </strong>
                  ?

                  <br />
                  <br />

                  {selectedCategory.isActive
                    ? "This category will no longer be available for new products."
                    : "This category will become available for new products."}
                </>
              )}

            </AlertDialogDescription>

          </AlertDialogHeader>

          <AlertDialogFooter>

            <AlertDialogCancel
              disabled={statusUpdating}
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmStatusChange();
              }}
              disabled={statusUpdating}
              className={
                selectedCategory?.isActive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >

              {statusUpdating
                ? "Updating..."
                : selectedCategory?.isActive
                  ? "Deactivate"
                  : "Activate"}

            </AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>

      </AlertDialog>

    </div>
  );
}