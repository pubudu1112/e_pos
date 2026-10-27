"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Search,
  RefreshCw,
  FolderTree,
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

type ServiceCategory = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function ServiceCategoriesClient() {
  const [categories, setCategories] = useState<
    ServiceCategory[]
  >([]);

  const [permissions, setPermissions] = useState<
    string[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [loadingPermissions, setLoadingPermissions] =
    useState(true);

  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);

  const [editingCategory, setEditingCategory] =
    useState<ServiceCategory | null>(null);

  const [name, setName] = useState("");

  const [description, setDescription] =
    useState("");

  const [statusDialogOpen, setStatusDialogOpen] =
    useState(false);

  const [statusCategory, setStatusCategory] =
    useState<ServiceCategory | null>(null);

  /* ============================================================
     PERMISSIONS
  ============================================================ */

  const canView = permissions.includes(
    "SERVICE_CATEGORY_VIEW"
  );

  const canCreate = permissions.includes(
    "SERVICE_CATEGORY_CREATE"
  );

  const canUpdate = permissions.includes(
    "SERVICE_CATEGORY_UPDATE"
  );

  /* ============================================================
     LOAD PERMISSIONS
  ============================================================ */

  async function loadPermissions() {
    try {
      setLoadingPermissions(true);

      const response = await fetch(
        "/api/auth/permissions",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (
        !response.ok ||
        !result.success ||
        !Array.isArray(result.data)
      ) {
        throw new Error(
          result.message ||
            "Failed to load permissions."
        );
      }

      setPermissions(result.data);
    } catch (error) {
      console.error(
        "Permission loading error:",
        error
      );

      setPermissions([]);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load permissions."
      );
    } finally {
      setLoadingPermissions(false);
    }
  }

  /* ============================================================
     LOAD SERVICE CATEGORIES
  ============================================================ */

  async function loadCategories() {
    if (!canView) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/products/service-categories",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to load service categories."
        );
      }

      const categoryData = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : [];

      setCategories(categoryData);
    } catch (error) {
      console.error(
        "Service category loading error:",
        error
      );

      setCategories([]);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load service categories."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    loadPermissions();
  }, []);

  useEffect(() => {
    if (!loadingPermissions) {
      loadCategories();
    }
  }, [loadingPermissions, canView]);

  /* ============================================================
     SEARCH
  ============================================================ */

  const filteredCategories = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) {
      return categories;
    }

    return categories.filter((category) => {
      return (
        category.name
          .toLowerCase()
          .includes(keyword) ||
        (category.description ?? "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [categories, search]);

  /* ============================================================
     RESET FORM
  ============================================================ */

  function resetForm() {
    setEditingCategory(null);
    setName("");
    setDescription("");
  }

  /* ============================================================
     OPEN ADD MODAL
  ============================================================ */

  function openAddModal() {
    if (!canCreate) {
      toast.error(
        "You do not have permission to create service categories."
      );

      return;
    }

    resetForm();

    setModalOpen(true);
  }

  /* ============================================================
     OPEN EDIT MODAL
  ============================================================ */

  function openEditModal(
    category: ServiceCategory
  ) {
    if (!canUpdate) {
      toast.error(
        "You do not have permission to update service categories."
      );

      return;
    }

    setEditingCategory(category);

    setName(category.name);

    setDescription(
      category.description ?? ""
    );

    setModalOpen(true);
  }

  /* ============================================================
     SAVE CATEGORY
  ============================================================ */

  async function saveCategory() {
    if (
      editingCategory &&
      !canUpdate
    ) {
      toast.error(
        "You do not have permission to update service categories."
      );

      return;
    }

    if (
      !editingCategory &&
      !canCreate
    ) {
      toast.error(
        "You do not have permission to create service categories."
      );

      return;
    }

    const trimmedName =
      name.trim();

    const trimmedDescription =
      description.trim();

    if (!trimmedName) {
      toast.error(
        "Category name is required."
      );

      return;
    }

    if (trimmedName.length > 100) {
      toast.error(
        "Category name cannot exceed 100 characters."
      );

      return;
    }

    if (
      trimmedDescription.length > 255
    ) {
      toast.error(
        "Description cannot exceed 255 characters."
      );

      return;
    }

    try {
      setSaving(true);

      const payload = editingCategory
        ? {
            id: editingCategory.id,
            name: trimmedName,
            description:
              trimmedDescription ||
              null,
            isActive:
              editingCategory.isActive,
          }
        : {
            name: trimmedName,
            description:
              trimmedDescription ||
              null,
          };

      const response =
        await fetch(
          "/api/products/service-categories",
          {
            method:
              editingCategory
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload
            ),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to save service category."
        );
      }

      toast.success(
        editingCategory
          ? "Service category updated successfully."
          : "Service category created successfully."
      );

      setModalOpen(false);

      resetForm();

      await loadCategories();
    } catch (error) {
      console.error(
        "Save category error:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save service category."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ============================================================
     OPEN STATUS CONFIRMATION
  ============================================================ */

  function openStatusConfirmation(
    category: ServiceCategory
  ) {
    if (!canUpdate) {
      toast.error(
        "You do not have permission to update service categories."
      );

      return;
    }

    setStatusCategory(category);

    setStatusDialogOpen(true);
  }

  /* ============================================================
     TOGGLE STATUS
  ============================================================ */

  async function toggleStatus() {
    if (
      !statusCategory ||
      !canUpdate
    ) {
      return;
    }

    try {
      setSaving(true);

      const response =
        await fetch(
          "/api/products/service-categories",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id: statusCategory.id,

              name:
                statusCategory.name,

              description:
                statusCategory.description,

              isActive:
                !statusCategory.isActive,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to update category status."
        );
      }

      toast.success(
        statusCategory.isActive
          ? "Service category deactivated."
          : "Service category activated."
      );

      setStatusDialogOpen(false);

      setStatusCategory(null);

      await loadCategories();
    } catch (error) {
      console.error(
        "Category status error:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update category status."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ============================================================
     REFRESH
  ============================================================ */

  async function refreshCategories() {
    await loadCategories();
  }

  /* ============================================================
     PERMISSION LOADING
  ============================================================ */

  if (loadingPermissions) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-muted-foreground">
          Loading permissions...
        </div>
      </div>
    );
  }

  /* ============================================================
     NO VIEW PERMISSION
  ============================================================ */

  if (!canView) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
        <FolderTree className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />

        <h2 className="text-xl font-semibold">
          Access Restricted
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view
          service categories.
        </p>
      </div>
    );
  }

  /* ============================================================
     UI
  ============================================================ */

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Service Categories
          </h1>

          <p className="text-sm text-muted-foreground">
            Manage categories used for services.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={
              refreshCategories
            }
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={
                openAddModal
              }
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" />

              Add Category
            </button>
          )}
        </div>
      </div>

      {/* SEARCH */}

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="text"
            placeholder="Search service categories..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">
                  #
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Category Name
                </th>

                <th className="px-4 py-3 text-left font-semibold">
                  Description
                </th>

                <th className="px-4 py-3 text-center font-semibold">
                  Status
                </th>

                <th className="px-4 py-3 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Loading service categories...
                  </td>
                </tr>
              ) : filteredCategories.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No service categories found.
                  </td>
                </tr>
              ) : (
                filteredCategories.map(
                  (
                    category,
                    index
                  ) => (
                    <tr
                      key={
                        category.id
                      }
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {
                          category.name
                        }
                      </td>

                      <td className="max-w-md px-4 py-3 text-muted-foreground">
                        {
                          category.description ||
                          "-"
                        }
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            category.isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {category.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canUpdate && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    category
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                              >
                                <Pencil className="h-3.5 w-3.5" />

                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openStatusConfirmation(
                                    category
                                  )
                                }
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                                  category.isActive
                                    ? "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                                    : "border border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/30"
                                }`}
                              >
                                {category.isActive
                                  ? "Deactivate"
                                  : "Activate"}
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

      {/* ADD / EDIT MODAL */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">
                {editingCategory
                  ? "Edit Service Category"
                  : "Add Service Category"}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {editingCategory
                  ? "Update service category details."
                  : "Create a new service category."}
              </p>
            </div>

            <div className="space-y-4">
              {/* NAME */}

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Category Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  maxLength={100}
                  placeholder="e.g. Printing"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  maxLength={255}
                  rows={4}
                  placeholder="Enter category description..."
                  className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setModalOpen(
                    false
                  )
                }
                disabled={saving}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveCategory
                }
                disabled={
                  saving ||
                  (editingCategory
                    ? !canUpdate
                    : !canCreate)
                }
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingCategory
                    ? "Update Category"
                    : "Create Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS CONFIRMATION */}

      <AlertDialog
        open={
          statusDialogOpen
        }
        onOpenChange={
          setStatusDialogOpen
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusCategory?.isActive
                ? "Deactivate Service Category?"
                : "Activate Service Category?"}
            </AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to{" "}
              {statusCategory?.isActive
                ? "deactivate"
                : "activate"}{" "}
              <strong>
                {
                  statusCategory?.name
                }
              </strong>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={saving}
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();

                toggleStatus();
              }}
              disabled={saving}
            >
              {saving
                ? "Updating..."
                : statusCategory?.isActive
                  ? "Deactivate"
                  : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}