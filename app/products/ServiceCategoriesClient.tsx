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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-full overflow-hidden">
      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Service Categories
          </h1>

          <p className="text-sm text-muted-foreground">
            Manage service categories for Pubudu Creative Hub (Photocopy, Color Printing, Binding, Laminating, Scanning).
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
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 shadow-sm"
            >
              <Plus className="h-4 w-4" />

              Add Category
            </button>
          )}
        </div>
      </div>

      {/* SPECIALIZED SERVICES INFO CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-indigo-500">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Binding Category
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports hidden cost tracking: Spiral / Comb / Wire / Tape material cost, front PVC + back board covers, and machine punch labor to compute exact Net Profit per book.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-purple-500">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Photocopy &amp; Color Printing
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Tracks per-sheet Paper Cost, Toner/Ink Cartridge consumption, and drum machine maintenance for accurate gross-to-net copy profit margins.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-emerald-500">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Laminating &amp; Scanning
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Includes thermal pouch film, pre-heat electricity consumption, and document digitizing services with real-time margin calculation.
          </p>
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
        <div className="overflow-x-auto min-w-full">
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

                <th className="px-4 py-3 text-left font-semibold">
                  Cost Breakdown System
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
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Loading service categories...
                  </td>
                </tr>
              ) : filteredCategories.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={6}
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
                  ) => {
                    const catName = category.name.toLowerCase();
                    let costSystemBadge = "Material & Overheads";
                    if (catName.includes("bind")) {
                      costSystemBadge = "Spine + Cover Sheets + Punch Labor";
                    } else if (catName.includes("photo") || catName.includes("print")) {
                      costSystemBadge = "Paper + Toner/Ink + Machine Wear";
                    } else if (catName.includes("lam")) {
                      costSystemBadge = "Pouch Film + Power + Roller Wear";
                    } else if (catName.includes("scan")) {
                      costSystemBadge = "Scanner Wear & Digital Labor";
                    }

                    return (
                      <tr
                        key={
                          category.id
                        }
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
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

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {costSystemBadge}
                          </span>
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
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border bg-background shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="shrink-0 border-b border-border p-5 bg-card">
              <h2 className="text-lg font-bold">
                {editingCategory
                  ? "Edit Service Category"
                  : "Add Service Category"}
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                {editingCategory
                  ? "Update service category details and description."
                  : "Create a new service category for Pubudu Creative Hub."}
              </p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* NAME */}

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                  placeholder="e.g. Binding"
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                  placeholder="e.g. Spiral binding, plastic comb binding, and hardcover thesis binding services..."
                  className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border bg-muted/40 p-4 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() =>
                  setModalOpen(
                    false
                  )
                }
                disabled={saving}
                className="rounded-xl border px-4 py-2 text-xs font-bold hover:bg-muted disabled:opacity-50"
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
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
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