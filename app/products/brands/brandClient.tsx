"use client";

import { useEffect, useState } from "react";
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
import { toast } from "sonner";

type Brand = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default function BrandClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // Permissions
  // ============================================================

  const [loadingPermissions, setLoadingPermissions] =
    useState(true);

  const [permissions, setPermissions] =
    useState<string[]>([]);

  const canView =
    permissions.includes("BRAND_VIEW");

  const canCreate =
    permissions.includes("BRAND_CREATE");

  const canUpdate =
    permissions.includes("BRAND_UPDATE");

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

  const [error, setError] =
    useState("");

  // ============================================================
  // Status Dialog
  // ============================================================

  const [showStatusDialog, setShowStatusDialog] =
    useState(false);

  const [selectedBrand, setSelectedBrand] =
    useState<Brand | null>(null);

  // ============================================================
  // Initial Load
  // ============================================================

  useEffect(() => {
    loadPermissions();
  }, []);

  useEffect(() => {
    if (!loadingPermissions && canView) {
      loadBrands();
    }
  }, [loadingPermissions, canView]);

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
        "LOAD BRAND PERMISSIONS ERROR:",
        error
      );

      setPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  }

  // ============================================================
  // Load Brands
  // Permission: BRAND_VIEW
  // ============================================================

  async function loadBrands() {
    if (!canView) {
      setBrands([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/products/brands",
        {
          method: "GET",
          cache: "no-store",
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
            "Unable to load brands."
        );

        toast.error(
          result.message ||
            "Unable to load brands."
        );

        return;
      }

      setBrands(result.data || []);
    } catch (error) {
      console.error(
        "LOAD BRANDS ERROR:",
        error
      );

      setError(
        "Unable to load brands."
      );

      toast.error(
        "Unable to load brands."
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // Open Add Modal
  // Permission: BRAND_CREATE
  // ============================================================

  function openAddModal() {
    if (!canCreate) {
      toast.error(
        "You do not have permission to create brands."
      );

      return;
    }

    setEditingId(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setError("");
    setShowModal(true);
  }

  // ============================================================
  // Open Edit Modal
  // Permission: BRAND_UPDATE
  // ============================================================

  function openEditModal(
    brand: Brand
  ) {
    if (!canUpdate) {
      toast.error(
        "You do not have permission to update brands."
      );

      return;
    }

    setEditingId(brand.id);
    setName(brand.name);
    setDescription(
      brand.description || ""
    );
    setIsActive(brand.isActive);
    setError("");
    setShowModal(true);
  }

  // ============================================================
  // Close Modal
  // ============================================================

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    setError("");
  }

  // ============================================================
  // Save Brand
  // CREATE -> BRAND_CREATE
  // UPDATE -> BRAND_UPDATE
  // ============================================================

  async function saveBrand() {
    setError("");

    // ----------------------------------------------------------
    // Permission
    // ----------------------------------------------------------

    if (editingId) {
      if (!canUpdate) {
        toast.error(
          "You do not have permission to update brands."
        );

        return;
      }
    } else {
      if (!canCreate) {
        toast.error(
          "You do not have permission to create brands."
        );

        return;
      }
    }

    const trimmedName =
      name.trim();

    const trimmedDescription =
      description.trim();

    // ----------------------------------------------------------
    // Validation
    // ----------------------------------------------------------

    if (!trimmedName) {
      setError(
        "Brand name is required."
      );

      toast.error(
        "Brand name is required."
      );

      return;
    }

    if (trimmedName.length > 100) {
      setError(
        "Brand name cannot exceed 100 characters."
      );

      toast.error(
        "Brand name cannot exceed 100 characters."
      );

      return;
    }

    if (
      trimmedDescription.length >
      255
    ) {
      setError(
        "Description cannot exceed 255 characters."
      );

      toast.error(
        "Description cannot exceed 255 characters."
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
            name: trimmedName,
            description:
              trimmedDescription,
            isActive,
          }
        : {
            name: trimmedName,
            description:
              trimmedDescription,
          };

      const response = await fetch(
        "/api/products/brands",
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
            "Unable to save brand."
        );

        toast.error(
          result.message ||
            "Unable to save brand."
        );

        return;
      }

      // --------------------------------------------------------
      // Update
      // --------------------------------------------------------

      if (editingId) {
        setBrands(
          (current) =>
            current
              .map((brand) =>
                brand.id ===
                editingId
                  ? result.data
                  : brand
              )
              .sort((a, b) =>
                a.name.localeCompare(
                  b.name
                )
              )
        );

        toast.success(
          "Brand updated successfully."
        );
      }

      // --------------------------------------------------------
      // Create
      // --------------------------------------------------------

      else {
        setBrands(
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
          "Brand created successfully."
        );
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error(
        "SAVE BRAND ERROR:",
        error
      );

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
  // Reset Form
  // ============================================================

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setError("");
  }

  // ============================================================
  // Request Status Change
  // Permission: BRAND_UPDATE
  // ============================================================

  function requestStatusChange(
    brand: Brand
  ) {
    if (!canUpdate) {
      toast.error(
        "You do not have permission to update brands."
      );

      return;
    }

    setSelectedBrand(brand);
    setShowStatusDialog(true);
  }

  // ============================================================
  // Close Status Dialog
  // ============================================================

  function closeStatusDialog() {
    if (!saving) {
      setShowStatusDialog(false);
      setSelectedBrand(null);
    }
  }

  // ============================================================
  // Confirm Status Change
  // Permission: BRAND_UPDATE
  // ============================================================

  async function confirmStatusChange() {
    if (!selectedBrand) {
      return;
    }

    if (!canUpdate) {
      toast.error(
        "You do not have permission to update brands."
      );

      return;
    }

    const brand =
      selectedBrand;

    const newStatus =
      !brand.isActive;

    try {
      setSaving(true);

      const response = await fetch(
        "/api/products/brands",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: brand.id,
            name: brand.name,
            description:
              brand.description,
            isActive: newStatus,
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
            "Unable to update brand status."
        );

        return;
      }

      setBrands(
        (current) =>
          current
            .map((item) =>
              item.id === brand.id
                ? result.data
                : item
            )
            .sort((a, b) =>
              a.name.localeCompare(
                b.name
              )
            )
      );

      toast.success(
        newStatus
          ? `"${brand.name}" activated successfully.`
          : `"${brand.name}" deactivated successfully.`
      );

      setShowStatusDialog(false);
      setSelectedBrand(null);
    } catch (error) {
      console.error(
        "UPDATE BRAND STATUS ERROR:",
        error
      );

      toast.error(
        "Unable to update brand status."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-background text-foreground p-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">

          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-foreground">
              Brands
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-muted-foreground">
              Manage product brands
            </p>
          </div>

          {/* Add Brand */}
          {!loadingPermissions &&
            canCreate && (
              <button
                type="button"
                onClick={openAddModal}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                + Add Brand
              </button>
            )}

        </div>

        {/* Brand List */}
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card shadow-sm">

          <div className="flex items-center justify-between border-b border-gray-200 dark:border-border px-5 py-4">

            <div>
              <h2 className="font-semibold text-gray-700 dark:text-foreground">
                Brand List
              </h2>

              <p className="mt-1 text-xs text-gray-400 dark:text-muted-foreground">
                {brands.length} brand
                {brands.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            {/* Refresh */}
            {!loadingPermissions &&
              canView && (
                <button
                  type="button"
                  onClick={loadBrands}
                  disabled={loading}
                  className="rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-muted/40 px-3 py-2 text-xs font-medium text-gray-600 dark:text-slate-200 transition hover:bg-gray-50 dark:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Refresh
                </button>
              )}

          </div>

          {loadingPermissions ? (
            <div className="p-10 text-center text-gray-500 dark:text-muted-foreground">
              Checking permissions...
            </div>
          ) : !canView ? (
            <div className="p-12 text-center">

              <div className="mb-3 text-4xl">
                🔒
              </div>

              <p className="font-medium text-gray-600 dark:text-muted-foreground">
                You do not have permission to view brands.
              </p>

            </div>
          ) : loading ? (
            <div className="p-10 text-center text-gray-500 dark:text-muted-foreground">
              Loading brands...
            </div>
          ) : brands.length === 0 ? (
            <div className="p-12 text-center">

              <div className="mb-3 text-4xl">
                🏷️
              </div>

              <p className="font-medium text-gray-600 dark:text-muted-foreground">
                No brands found
              </p>

              <p className="mt-1 text-sm text-gray-400 dark:text-muted-foreground">
                Add your first product brand.
              </p>

              {/* Add Brand */}
              {!loadingPermissions &&
                canCreate && (
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    + Add Brand
                  </button>
                )}

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
                      Brand Name
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

                  {brands.map(
                    (brand) => (
                      <tr
                        key={brand.id}
                        className="border-t border-gray-100 dark:border-border/60 transition hover:bg-gray-50 dark:hover:bg-muted/30"
                      >

                        <td className="px-5 py-4 text-gray-600 dark:text-muted-foreground">
                          {brand.id}
                        </td>

                        <td className="px-5 py-4 font-medium text-gray-800 dark:text-foreground">
                          {brand.name}
                        </td>

                        <td className="px-5 py-4 text-gray-500 dark:text-muted-foreground">
                          {brand.description ||
                            "-"}
                        </td>

                        <td className="px-5 py-4">

                          {/* Status */}
                          {canUpdate ? (
                            <button
                              type="button"
                              onClick={() =>
                                requestStatusChange(
                                  brand
                                )
                              }
                              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                brand.isActive
                                  ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 hover:bg-green-200"
                                  : "bg-gray-100 dark:bg-muted text-gray-600 dark:text-muted-foreground hover:bg-gray-200"
                              }`}
                            >
                              {brand.isActive
                                ? "Active"
                                : "Inactive"}
                            </button>
                          ) : (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                brand.isActive
                                  ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                                  : "bg-gray-100 dark:bg-muted text-gray-600 dark:text-muted-foreground"
                              }`}
                            >
                              {brand.isActive
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
                                    brand
                                  )
                                }
                                className="mr-4 text-blue-600 dark:text-blue-400 transition hover:text-blue-800 hover:underline"
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
                                  requestStatusChange(
                                    brand
                                  )
                                }
                                className={
                                  brand.isActive
                                    ? "text-red-600 dark:text-red-400 transition hover:text-red-800 hover:underline"
                                    : "text-green-600 dark:text-green-400 transition hover:text-green-800 hover:underline"
                                }
                              >
                                {brand.isActive
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
                      ? "Edit Brand"
                      : "Add Brand"}
                  </h2>

                  <p className="mt-1 text-xs text-gray-500 dark:text-muted-foreground">
                    {editingId
                      ? "Update brand information"
                      : "Create a new product brand"}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="text-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
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

                {/* Brand Name */}
                <div>

                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
                    Brand Name
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
                    placeholder="Enter brand name"
                    disabled={saving}
                    maxLength={100}
                    className="w-full rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-muted/40 px-3 py-2.5 text-sm text-gray-900 dark:text-foreground outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1 text-right text-xs text-gray-400 dark:text-muted-foreground">
                    {name.length}/100
                  </p>

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
                    maxLength={255}
                    className="w-full resize-none rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-muted/40 px-3 py-2.5 text-sm text-gray-900 dark:text-foreground outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1 text-right text-xs text-gray-400 dark:text-muted-foreground">
                    {description.length}/255
                  </p>

                </div>

                {/* Status - Edit only */}
                {editingId && (

                  <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-muted/30 px-4 py-3">

                    <div>

                      <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                        Brand Status
                      </p>

                      <p className="mt-1 text-xs text-gray-400 dark:text-muted-foreground">
                        Inactive brands won't be available
                        for new products.
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
                      className={`relative h-6 w-11 rounded-full transition ${
                        isActive
                          ? "bg-green-500"
                          : "bg-gray-300 dark:bg-muted"
                      }`}
                    >

                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                          isActive
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
                  className="rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-card px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 transition hover:bg-gray-100 dark:hover:bg-muted/50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveBrand}
                  disabled={
                    saving ||
                    (editingId
                      ? !canUpdate
                      : !canCreate)
                  }
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Brand"
                      : "Save Brand"}
                </button>

              </div>

            </div>

          </div>

        )}

      </div>

      {/* Status Confirmation Dialog */}
      <AlertDialog
        open={showStatusDialog}
        onOpenChange={(open) => {

          if (
            !open &&
            !saving
          ) {
            closeStatusDialog();
          }

        }}
      >

        <AlertDialogContent>

          <AlertDialogHeader>

            <AlertDialogTitle>
              {selectedBrand?.isActive
                ? "Deactivate Brand?"
                : "Activate Brand?"}
            </AlertDialogTitle>

            <AlertDialogDescription>

              {selectedBrand && (
                <>
                  Are you sure you want to{" "}

                  <span className="font-semibold text-gray-900">
                    {selectedBrand.isActive
                      ? "deactivate"
                      : "activate"}
                  </span>{" "}

                  the brand{" "}

                  <span className="font-semibold text-gray-900">
                    "{selectedBrand.name}"
                  </span>
                  ?

                  <br />
                  <br />

                  {selectedBrand.isActive
                    ? "This brand will not be available when creating new products."
                    : "This brand will become available for new products again."}
                </>
              )}

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
                confirmStatusChange();
              }}
              disabled={
                saving ||
                !canUpdate
              }
              className={
                selectedBrand?.isActive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {saving
                ? "Updating..."
                : selectedBrand?.isActive
                  ? "Deactivate"
                  : "Activate"}
            </AlertDialogAction>

          </AlertDialogFooter>

        </AlertDialogContent>

      </AlertDialog>
    </>
  );
}